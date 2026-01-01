import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  publicEncrypt,
  randomInt,
} from "crypto";

export interface DahuaLoginResponse {
  success: boolean;
  session?: string;
  error?: string;
  keepAliveInterval?: number;
}

export interface DahuaChallengeParams {
  authorization: string;
  encryption: string;
  random: string;
  realm: string;
}

export interface DahuaSession {
  sessionId: string;
  host: string;
  username: string;
  keepAliveInterval: number;
}

interface DahuaEncryptInfo {
  asymmetric: boolean;
  cipher: string[];
  pub: string;
}

type CipherMode = "CBC" | "ECB";

/**
 * Dahua NVR/Camera API Client
 * Implements the challenge-response authentication protocol
 */
export class DahuaClient {
  private host: string;
  private session: DahuaSession | null = null;
  private requestId = 1;
  private encryptInfo: DahuaEncryptInfo | null = null;

  constructor(host: string) {
    // Ensure host doesn't have trailing slash
    this.host = host.replace(/\/$/, "");
  }

  /**
   * MD5 hash helper
   */
  private md5(input: string): string {
    return createHash("md5").update(input).digest("hex").toUpperCase();
  }

  private randomNumericString(length: number): string {
    let out = "";
    for (let i = 0; i < length; i += 1) {
      out += randomInt(0, 10).toString();
    }
    return out;
  }

  private bufferFromBigIntString(value: string): Buffer {
    if (/^[0-9a-fA-F]+$/.test(value)) {
      const hex = value.length % 2 === 0 ? value : `0${value}`;
      return Buffer.from(hex, "hex");
    }

    const asBigInt = BigInt(value);
    let hex = asBigInt.toString(16);
    if (hex.length % 2 !== 0) {
      hex = `0${hex}`;
    }
    return Buffer.from(hex, "hex");
  }

  private base64Url(buf: Buffer): string {
    return buf
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  private buildRsaPublicKey(pub: string) {
    const parts = pub.split(",");
    const nPart = parts.find((part) => part.startsWith("N:"));
    const ePart = parts.find((part) => part.startsWith("E:"));

    if (!nPart || !ePart) {
      throw new Error(`Invalid RSA public key format: ${pub}`);
    }

    const nValue = nPart.split(":")[1];
    const eValue = ePart.split(":")[1];
    const nBuffer = this.bufferFromBigIntString(nValue);
    const eBuffer = this.bufferFromBigIntString(eValue);

    return createPublicKey({
      key: {
        kty: "RSA",
        n: this.base64Url(nBuffer),
        e: this.base64Url(eBuffer),
      },
      format: "jwk",
    });
  }

  private selectEncryptMode(cipherList: string[]) {
    if (cipherList.includes("RPAC")) {
      return { type: "RPAC", randLen: 32, mode: "CBC" as CipherMode };
    }

    if (cipherList.includes("AES")) {
      return { type: "AES", randLen: 16, mode: "ECB" as CipherMode };
    }

    throw new Error(`Unsupported cipher list: ${cipherList.join(",")}`);
  }

  private padZero(data: Buffer, blockSize: number): Buffer {
    const remainder = data.length % blockSize;
    if (remainder === 0) {
      return data;
    }

    const padding = Buffer.alloc(blockSize - remainder, 0x00);
    return Buffer.concat([data, padding]);
  }

  private encryptContent(
    data: Record<string, unknown>,
    encryptInfo: DahuaEncryptInfo
  ) {
    const mode = this.selectEncryptMode(encryptInfo.cipher);
    const keyString = this.randomNumericString(mode.randLen);
    const keyBuffer = Buffer.from(keyString, "utf8");
    const iv = Buffer.from("0000000000000000", "utf8");

    const algorithm =
      mode.type === "RPAC" ? "aes-256-cbc" : "aes-128-ecb";
    const cipher = createCipheriv(algorithm, keyBuffer, iv);
    cipher.setAutoPadding(false);

    const plain = Buffer.from(JSON.stringify(data), "utf8");
    const padded = this.padZero(plain, 16);
    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);

    const rsaKey = this.buildRsaPublicKey(encryptInfo.pub);
    const salt = publicEncrypt(
      { key: rsaKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(keyString, "utf8")
    );

    return {
      salt: salt.toString("hex"),
      cipher: `${mode.type}-${mode.randLen * 8}`,
      content: encrypted.toString("base64"),
      key: keyBuffer,
      mode: mode.mode,
    };
  }

  private decryptContent(key: Buffer, mode: CipherMode, content: string) {
    const iv = Buffer.from("0000000000000000", "utf8");
    const algorithm = mode === "CBC" ? "aes-256-cbc" : "aes-128-ecb";
    const decipher = createDecipheriv(algorithm, key, iv);
    decipher.setAutoPadding(false);

    const encrypted = Buffer.from(content, "base64");
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const unpadded = decrypted.toString("utf8").replace(/\x00+$/g, "");
    try {
      return JSON.parse(unpadded);
    } catch {
      const fallback = decrypted.toString("latin1").replace(/\x00+$/g, "");
      return JSON.parse(fallback);
    }
  }

  private async ensureEncryptInfo(): Promise<DahuaEncryptInfo> {
    if (this.encryptInfo) {
      return this.encryptInfo;
    }

    const response = (await this.sendRpc("Security.getEncryptInfo", {})) as {
      params?: DahuaEncryptInfo;
    };

    if (!response.params) {
      throw new Error("Failed to fetch encryption info");
    }

    this.encryptInfo = response.params;
    return response.params;
  }

  private async encryptContentSend(
    method: string,
    payload: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.session) {
      throw new Error("Not logged in");
    }

    const encryptInfo = await this.ensureEncryptInfo();
    if (!encryptInfo.asymmetric) {
      return this.sendRpc(method, payload, "/RPC2", this.session.sessionId);
    }

    const encrypted = this.encryptContent(payload, encryptInfo);
    const response = (await this.sendRpc(
      method,
      {
        salt: encrypted.salt,
        cipher: encrypted.cipher,
        content: encrypted.content,
      },
      "/RPC2",
      this.session.sessionId
    )) as { params?: { content?: string } };

    if (response.params?.content) {
      const decrypted = this.decryptContent(
        encrypted.key,
        encrypted.mode,
        response.params.content
      );
      return {
        ...response,
        params: decrypted,
      };
    }

    return response;
  }

  /**
   * Calculate the password hash using Dahua's digest algorithm
   * Formula: MD5(username:random:MD5(username:realm:password))
   */
  private calculatePasswordHash(
    username: string,
    password: string,
    realm: string,
    random: string
  ): string {
    // Step 1: HA1 = MD5(username:realm:password)
    const ha1 = this.md5(`${username}:${realm}:${password}`);

    // Step 2: Final = MD5(username:random:HA1)
    const finalHash = this.md5(`${username}:${random}:${ha1}`);

    return finalHash;
  }

  /**
   * Send RPC request to the Dahua device
   */
  private async sendRpc(
    method: string,
    params: Record<string, unknown>,
    endpoint: string = "/RPC2",
    sessionId?: string
  ): Promise<unknown> {
    const body: Record<string, unknown> = {
      method,
      params,
      id: this.requestId++,
    };

    if (sessionId) {
      body.session = sessionId;
    }

    const response = await fetch(`${this.host}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * Phase 1: Request login challenge
   */
  private async requestChallenge(
    username: string
  ): Promise<{ session: string; params: DahuaChallengeParams }> {
    const response = (await this.sendRpc(
      "global.login",
      {
        userName: username,
        password: "",
        clientType: "Web3.0",
      },
      "/RPC2_Login"
    )) as {
      session: string;
      params: DahuaChallengeParams;
      error?: { code: number; message: string };
    };

    // Error code 268632079 means "login challenge" - this is expected
    if (response.error?.code !== 268632079) {
      throw new Error(
        `Unexpected response during challenge: ${JSON.stringify(response)}`
      );
    }

    return {
      session: response.session,
      params: response.params,
    };
  }

  /**
   * Phase 2: Complete authentication with hashed password
   */
  private async authenticate(
    username: string,
    passwordHash: string,
    sessionId: string,
    encryption: string
  ): Promise<{ success: boolean; keepAliveInterval?: number }> {
    const response = (await this.sendRpc(
      "global.login",
      {
        userName: username,
        password: passwordHash,
        clientType: "Web3.0",
        authorityType: encryption,
        passwordType: encryption,
      },
      "/RPC2_Login",
      sessionId
    )) as {
      result: boolean;
      params?: { keepAliveInterval: number };
      error?: { code: number; message: string };
    };

    if (!response.result) {
      throw new Error(
        `Authentication failed: ${response.error?.message || "Unknown error"}`
      );
    }

    return {
      success: true,
      keepAliveInterval: response.params?.keepAliveInterval,
    };
  }

  /**
   * Login to the Dahua device
   */
  async login(username: string, password: string): Promise<DahuaLoginResponse> {
    try {
      // Phase 1: Get challenge
      const challenge = await this.requestChallenge(username);

      // Calculate password hash
      const passwordHash = this.calculatePasswordHash(
        username,
        password,
        challenge.params.realm,
        challenge.params.random
      );

      // Phase 2: Authenticate
      const authResult = await this.authenticate(
        username,
        passwordHash,
        challenge.session,
        challenge.params.encryption
      );

      // Store session
      this.session = {
        sessionId: challenge.session,
        host: this.host,
        username,
        keepAliveInterval: authResult.keepAliveInterval || 60,
      };

      return {
        success: true,
        session: challenge.session,
        keepAliveInterval: authResult.keepAliveInterval,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Logout from the device
   */
  async logout(): Promise<boolean> {
    if (!this.session) {
      return false;
    }

    try {
      await this.sendRpc("global.logout", {}, "/RPC2", this.session.sessionId);
      this.session = null;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Keep the session alive
   */
  async keepAlive(): Promise<boolean> {
    if (!this.session) {
      return false;
    }

    try {
      const response = (await this.sendRpc(
        "global.keepAlive",
        {
          timeout: 300,
          active: false,
        },
        "/RPC2",
        this.session.sessionId
      )) as { result: boolean };

      return response.result;
    } catch {
      return false;
    }
  }

  /**
   * Get current session info
   */
  getSession(): DahuaSession | null {
    return this.session;
  }

  /**
   * Check if logged in
   */
  isLoggedIn(): boolean {
    return this.session !== null;
  }

  /**
   * Update camera configuration using secure RPC
   */
  async setCamera(
    cameras: Record<string, unknown> | Array<Record<string, unknown>>
  ): Promise<unknown> {
    const cameraList = Array.isArray(cameras) ? cameras : [cameras];
    return this.encryptContentSend("LogicDeviceManager.secSetCamera", {
      cameras: cameraList,
    });
  }

  /**
   * Send a generic RPC command (must be logged in)
   */
  async rpc(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<unknown> {
    if (!this.session) {
      throw new Error("Not logged in");
    }

    return this.sendRpc(method, params, "/RPC2", this.session.sessionId);
  }
}
