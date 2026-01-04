import { randomUUID } from "crypto";
import { mkdir, readFile, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { spawn } from "child_process";
import WebSocket from "ws";
import { RtspOverWebSocket } from "./rtsp-ws";

export type StreamStartOptions = {
  host: string;
  username: string;
  password: string;
  channel: number;
  subtype: number;
};

type HlsStartOptions = StreamStartOptions & {
  rtspPort?: number;
};

type StreamSession = {
  id: string;
  rtsp: RtspOverWebSocket;
  subscribers: Set<WebSocket>;
};

type HlsSession = {
  id: string;
  dir: string;
  playlistPath: string;
  process: ReturnType<typeof spawn>;
};

export class StreamManager {
  private streams = new Map<string, StreamSession>();
  private hlsStreams = new Map<string, HlsSession>();

  async startStream(options: StreamStartOptions): Promise<StreamSession> {
    const id = randomUUID();
    const subscribers = new Set<WebSocket>();

    const rtsp = new RtspOverWebSocket({
      host: options.host,
      username: options.username,
      password: options.password,
      channel: options.channel,
      subtype: options.subtype,
      onRtp: (packet) => {
        for (const client of subscribers) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(packet);
          }
        }
      },
      onClose: (reason) => {
        this.closeStream(id, reason);
      },
    });

    const session: StreamSession = { id, rtsp, subscribers };
    this.streams.set(id, session);

    await rtsp.start();
    return session;
  }

  stopStream(id: string): boolean {
    const session = this.streams.get(id);
    if (!session) {
      return false;
    }

    session.rtsp.stop("stream stopped");
    this.closeSubscribers(session, "stream stopped");
    this.streams.delete(id);
    return true;
  }

  addSubscriber(id: string, ws: WebSocket): boolean {
    const session = this.streams.get(id);
    if (!session) {
      return false;
    }

    session.subscribers.add(ws);
    ws.on("close", () => {
      session.subscribers.delete(ws);
    });

    return true;
  }

  getStream(id: string): StreamSession | undefined {
    return this.streams.get(id);
  }

  getSdp(id: string): string | null {
    const session = this.streams.get(id);
    if (!session) {
      return null;
    }

    return session.rtsp.getSdp();
  }

  async startHlsStream(options: HlsStartOptions): Promise<HlsSession> {
    const id = randomUUID();
    const dir = path.join(tmpdir(), `camlab-hls-${id}`);
    await mkdir(dir, { recursive: true });

    const port = options.rtspPort ? options.rtspPort.toString() : this.resolvePort(options.host);
    const rtspUrl = this.buildRtspUrl(options, port);
    const playlistPath = path.join(dir, "index.m3u8");

    const args = [
      "-rtsp_transport",
      "tcp",
      "-i",
      rtspUrl,
      "-c",
      "copy",
      "-f",
      "hls",
      "-hls_time",
      "1",
      "-hls_list_size",
      "6",
      "-hls_flags",
      "delete_segments+append_list",
      "-hls_segment_type",
      "mpegts",
      playlistPath,
    ];

    const process = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let lastError = "";
    let lastOutput = "";
    process.stderr?.on("data", (chunk) => {
      const message = chunk.toString();
      lastOutput = message.trim();
      if (message.includes("Error")) {
        lastError = message.trim();
        console.warn(`[FFmpeg] ${message.trim()}`);
      }
    });

    const session: HlsSession = { id, dir, playlistPath, process };
    this.hlsStreams.set(id, session);

    process.on("exit", () => {
      this.hlsStreams.delete(id);
      void rm(dir, { recursive: true, force: true });
    });

    const ready = await this.waitForPlaylist(playlistPath, 30, 500);
    if (!ready) {
      this.stopHlsStream(id);
      throw new Error(lastError || lastOutput || "HLS playlist was not created; check RTSP stream");
    }

    return session;
  }

  stopHlsStream(id: string): boolean {
    const session = this.hlsStreams.get(id);
    if (!session) {
      return false;
    }

    this.hlsStreams.delete(id);
    session.process.kill("SIGTERM");
    void rm(session.dir, { recursive: true, force: true });
    return true;
  }

  async getHlsFile(id: string, fileName: string): Promise<{ data: Buffer; size: number } | null> {
    const session = this.hlsStreams.get(id);
    if (!session) {
      return null;
    }

    if (!this.isSafeFileName(fileName)) {
      return null;
    }

    const filePath = path.join(session.dir, fileName);
    try {
      const info = await stat(filePath);
      const data = await readFile(filePath);
      return { data, size: info.size };
    } catch {
      return null;
    }
  }

  private resolvePort(host: string): string {
    const url = new URL(host);
    return url.port || (url.protocol === "https:" ? "443" : "80");
  }

  private async waitForPlaylist(
    pathname: string,
    attempts: number,
    delayMs: number
  ): Promise<boolean> {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const info = await stat(pathname);
        if (info.size > 0) {
          return true;
        }
      } catch {
        // ignore until retries exhausted
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return false;
  }

  private buildRtspUrl(options: StreamStartOptions, port: string): string {
    const url = new URL(options.host);
    const rtsp = new URL(`rtsp://${url.hostname}:${port}/cam/realmonitor`);
    rtsp.username = options.username;
    rtsp.password = options.password;
    rtsp.search = `channel=${options.channel}&subtype=${options.subtype}`;
    return rtsp.toString();
  }

  private isSafeFileName(fileName: string): boolean {
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return false;
    }

    return fileName.length > 0;
  }

  private closeStream(id: string, reason: string): void {
    const session = this.streams.get(id);
    if (!session) {
      return;
    }

    this.closeSubscribers(session, reason);
    this.streams.delete(id);
  }

  private closeSubscribers(session: StreamSession, reason: string): void {
    for (const ws of session.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, reason);
      }
    }
    session.subscribers.clear();
  }
}

export const streamManager = new StreamManager();
