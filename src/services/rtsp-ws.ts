import { createHash, randomBytes } from "crypto";
import WebSocket from "ws";

export type RtspTrack = {
  type: "video" | "audio";
  control: string;
};

type RtspResponse = {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

type DigestAuthState = {
  realm: string;
  nonce: string;
  qop?: string;
};

type RtspOptions = {
  host: string;
  username: string;
  password: string;
  channel: number;
  subtype: number;
  onRtp: (packet: Buffer) => void;
  onClose?: (reason: string) => void;
};

export class RtspOverWebSocket {
  private ws: WebSocket | null = null;
  private cseq = 1;
  private sessionId: string | null = null;
  private pending = new Map<number, (response: RtspResponse) => void>();
  private digest: DigestAuthState | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private options: RtspOptions;
  private baseRtspUrl: string;
  private wsUrl: string;
  private sdp: string | null = null;

  constructor(options: RtspOptions) {
    this.options = options;
    const hostUrl = new URL(options.host);
    const wsProtocol = hostUrl.protocol === "https:" ? "wss:" : "ws:";
    const port = hostUrl.port || (hostUrl.protocol === "https:" ? "443" : "80");

    const wsUrl = new URL(hostUrl.toString());
    wsUrl.protocol = wsProtocol;
    wsUrl.port = port;
    wsUrl.pathname = "/rtspoverwebsocket";
    wsUrl.search = "";
    this.wsUrl = wsUrl.toString();

    const rtspUrl = new URL(`rtsp://${hostUrl.hostname}:${port}`);
    rtspUrl.pathname = "/cam/realmonitor";
    rtspUrl.search = `channel=${options.channel}&subtype=${options.subtype}`;
    this.baseRtspUrl = rtspUrl.toString();
  }

  async start(): Promise<void> {
    await this.connect();

    await this.request("OPTIONS", this.baseRtspUrl);
    const describe = await this.request("DESCRIBE", this.baseRtspUrl, {
      Accept: "application/sdp",
    });

    this.sdp = describe.body;
    const tracks = this.parseSdp(describe.body);
    const orderedTracks = this.orderTracks(tracks);
    let channel = 0;

    for (const track of orderedTracks) {
      const trackUrl = this.resolveTrackUrl(track.control);
      const transport = `RTP/AVP/TCP;unicast;interleaved=${channel}-${channel + 1}`;
      const setup = await this.request("SETUP", trackUrl, {
        Transport: transport,
      });
      const sessionHeader = setup.headers.session;
      if (sessionHeader) {
        this.sessionId = sessionHeader.split(";")[0];
      }
      channel += 2;
    }

    await this.request("PLAY", this.baseRtspUrl, {
      Range: "npt=0.000-",
    });

    this.keepAliveTimer = setInterval(() => {
      void this.request("OPTIONS", this.baseRtspUrl).catch(() => {
        this.stop("keepalive failed");
      });
    }, 25_000);
  }

  getSdp(): string | null {
    return this.sdp;
  }

  stop(reason: string): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    const ws = this.ws;
    if (ws) {
      try {
        if (this.sessionId) {
          void this.request("TEARDOWN", this.baseRtspUrl).catch(() => undefined);
        }
      } catch {
        // ignore teardown errors
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      this.ws = null;
    }

    if (this.options.onClose) {
      this.options.onClose(reason);
    }
  }

  private async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.binaryType = "arraybuffer";

      ws.on("open", () => resolve());
      ws.on("error", (err: Error) => reject(err));
      ws.on("close", () => {
        this.stop("upstream closed");
      });
      ws.on("message", (data: WebSocket.RawData) => this.handleMessage(data));
    });
  }

  private handleMessage(data: WebSocket.RawData): void {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

    if (buffer.length === 0) {
      return;
    }

    if (buffer[0] === 0x24) {
      this.options.onRtp(buffer);
      return;
    }

    const response = this.parseResponse(buffer.toString("utf8"));
    const cseqValue = response.headers.cseq;
    if (!cseqValue) {
      return;
    }

    const cseq = Number.parseInt(cseqValue, 10);
    const resolver = this.pending.get(cseq);
    if (resolver) {
      this.pending.delete(cseq);
      resolver(response);
    }
  }

  private parseResponse(payload: string): RtspResponse {
    const headerEnd = payload.indexOf("\r\n\r\n");
    const headerText = headerEnd >= 0 ? payload.slice(0, headerEnd) : payload;
    const bodyText = headerEnd >= 0 ? payload.slice(headerEnd + 4) : "";
    const lines = headerText.split("\r\n");
    const statusLine = lines.shift() || "";
    const [_protocol, statusCodeStr, ...statusParts] = statusLine.split(" ");
    const statusCode = Number.parseInt(statusCodeStr, 10) || 0;
    const statusText = statusParts.join(" ").trim();

    const headers: Record<string, string> = {};
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      headers[key] = value;
    }

    const contentLength = Number.parseInt(headers["content-length"] || "0", 10);
    const body = contentLength > 0 ? bodyText.slice(0, contentLength) : bodyText;

    return {
      statusCode,
      statusText,
      headers,
      body,
    };
  }

  private async request(
    method: string,
    url: string,
    extraHeaders: Record<string, string> = {},
    body?: string,
    allowRetry: boolean = true
  ): Promise<RtspResponse> {
    const cseq = this.cseq++;
    const headers: Record<string, string> = {
      CSeq: cseq.toString(),
      "User-Agent": "camlab",
      ...extraHeaders,
    };

    if (this.sessionId) {
      headers.Session = this.sessionId;
    }

    if (body) {
      headers["Content-Length"] = Buffer.byteLength(body).toString();
    }

    if (this.digest) {
      headers.Authorization = this.buildDigestAuth(method, url, this.digest);
    }

    const message = this.buildRequest(method, url, headers, body);
    if (!this.ws) {
      throw new Error("WebSocket not connected");
    }

    const response = await new Promise<RtspResponse>((resolve) => {
      this.pending.set(cseq, resolve);
      this.ws?.send(message);
    });

    console.log(`[RTSP] ${method} ${url} -> ${response.statusCode} ${response.statusText}`);

    if (response.statusCode === 401 && allowRetry) {
      const wwwAuth = response.headers["www-authenticate"];
      if (wwwAuth) {
        const digest = this.parseDigest(wwwAuth);
        if (digest) {
          this.digest = digest;
          return this.request(method, url, extraHeaders, body, false);
        }
      }
    }

    if (response.statusCode >= 400) {
      throw new Error(`RTSP ${method} failed: ${response.statusCode} ${response.statusText}`);
    }

    return response;
  }

  private buildRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: string
  ): string {
    const lines = [`${method} ${url} RTSP/1.0`];
    for (const [key, value] of Object.entries(headers)) {
      lines.push(`${key}: ${value}`);
    }
    lines.push("", "");
    return body ? lines.join("\r\n") + body : lines.join("\r\n");
  }

  private parseDigest(header: string): DigestAuthState | null {
    if (!header.toLowerCase().startsWith("digest")) {
      return null;
    }
    const params = header.slice(6).split(",");
    const digest: Record<string, string> = {};
    for (const param of params) {
      const [rawKey, rawValue] = param.split("=");
      if (!rawKey || !rawValue) continue;
      const key = rawKey.trim();
      const value = rawValue.trim().replace(/^"|"$/g, "");
      digest[key] = value;
    }

    if (!digest.realm || !digest.nonce) {
      return null;
    }

    return {
      realm: digest.realm,
      nonce: digest.nonce,
      qop: digest.qop,
    };
  }

  private buildDigestAuth(method: string, uri: string, digest: DigestAuthState): string {
    const ha1 = this.md5(`${this.options.username}:${digest.realm}:${this.options.password}`);
    const ha2 = this.md5(`${method}:${uri}`);

    let response: string;
    let auth = `Digest username="${this.options.username}", realm="${digest.realm}", nonce="${digest.nonce}", uri="${uri}", algorithm="MD5"`;

    if (digest.qop) {
      const qop = digest.qop.split(",")[0].trim();
      const nc = "00000001";
      const cnonce = randomBytes(8).toString("hex");
      response = this.md5(`${ha1}:${digest.nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
      auth += `, response="${response}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
    } else {
      response = this.md5(`${ha1}:${digest.nonce}:${ha2}`);
      auth += `, response="${response}"`;
    }

    return auth;
  }

  private md5(value: string): string {
    return createHash("md5").update(value).digest("hex");
  }

  private parseSdp(sdp: string): RtspTrack[] {
    const lines = sdp.split("\r\n");
    const tracks: RtspTrack[] = [];
    let currentType: RtspTrack["type"] | null = null;

    for (const line of lines) {
      if (line.startsWith("m=")) {
        const parts = line.slice(2).split(" ");
        const media = parts[0];
        if (media === "video" || media === "audio") {
          currentType = media;
        } else {
          currentType = null;
        }
        continue;
      }

      if (currentType && line.startsWith("a=control:")) {
        const control = line.slice("a=control:".length).trim();
        tracks.push({ type: currentType, control });
        currentType = null;
      }
    }

    return tracks;
  }

  private orderTracks(tracks: RtspTrack[]): RtspTrack[] {
    const video = tracks.filter((track) => track.type === "video");
    const audio = tracks.filter((track) => track.type === "audio");
    if (video.length === 0 && audio.length === 0) {
      return [
        { type: "video", control: "trackID=0" },
        { type: "audio", control: "trackID=1" },
      ];
    }
    return [...video, ...audio];
  }

  private resolveTrackUrl(control: string): string {
    if (control.startsWith("rtsp://")) {
      return control;
    }

    if (control.startsWith("/")) {
      return `${this.baseRtspUrl}${control}`;
    }

    return `${this.baseRtspUrl}/${control}`;
  }
}
