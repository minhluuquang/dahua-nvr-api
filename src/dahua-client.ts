import {
  constants,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  publicEncrypt,
} from "crypto";

// ============================================================================
// Type Definitions
// ============================================================================

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

/**
 * Encryption info returned by Security.getEncryptInfo
 * Example from reverse engineering:
 * {
 *   "AESPadding": ["ZERO", "PKCS7"],
 *   "asymmetric": "RSA",
 *   "cipher": ["AES", "RPAC"],
 *   "pub": "N:E17FA1E4...,E:010001"
 * }
 */
interface DahuaEncryptInfo {
  AESPadding?: string[];
  asymmetric: string;
  cipher: string[];
  pub: string;
}

/**
 * Encryption mode configuration
 * Based on reverse engineering:
 * - RPAC: randLen=32, mode=CBC (AES-256-CBC)
 * - AES: randLen=16, mode=ECB (AES-128-ECB)
 */
interface EncryptMode {
  type: "RPAC" | "AES";
  randLen: number;
  mode: "CBC" | "ECB";
}

/**
 * Result of encrypting content
 */
interface EncryptedContent {
  salt: string;      // RSA encrypted AES key (hex string)
  cipher: string;    // e.g., "RPAC-256"
  content: string;   // AES encrypted data (base64)
  key: Buffer;       // Raw AES key for decrypting response
  mode: "CBC" | "ECB";
}

// ============================================================================
// Dahua Client Implementation
// ============================================================================

/**
 * Dahua NVR/Camera API Client
 * 
 * Implements:
 * - Challenge-response authentication protocol
 * - RPAC-256 encryption for secure RPC calls (RSA + AES-256-CBC)
 * 
 * Based on reverse engineering of the Dahua web interface.
 */
export class DahuaClient {
  private host: string;
  private session: DahuaSession | null = null;
  private requestId = 1;
  private encryptInfo: DahuaEncryptInfo | null = null;
  private encryptMode: EncryptMode | null = null;

  constructor(host: string) {
    // Ensure host doesn't have trailing slash
    this.host = host.replace(/\/$/, "");
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * MD5 hash helper - returns uppercase hex string
   */
  private md5(input: string): string {
    return createHash("md5").update(input).digest("hex").toUpperCase();
  }

  /**
   * Generate a random numeric string of specified length
   * 
   * Based on reverse engineering of RandomNum function:
   * ```javascript
   * function RandomNum(a) {
   *   var c = "";
   *   if (16 >= a) {
   *     var d = Math.random().toString();
   *     c = "0" === d.substr(d.length - a, 1) ? RandomNum(a) : d.substring(d.length - a);
   *   } else {
   *     for (var e = Math.floor(a / 16), f = 0; e > f; f++) c += RandomNum(16);
   *     c += RandomNum(a % 16);
   *   }
   *   return c;
   * }
   * ```
   */
  private generateRandomKey(length: number): string {
    let result = "";
    while (result.length < length) {
      // Get random digits from Math.random().toString()
      const randomStr = Math.random().toString();
      // Take digits from the end, avoiding leading zeros
      const digits = randomStr.slice(-Math.min(16, length - result.length));
      if (digits[0] !== "0" || result.length > 0) {
        result += digits;
      }
    }
    return result.slice(0, length);
  }

  // ==========================================================================
  // RSA Key Handling
  // ==========================================================================

  /**
   * Convert a hex string or decimal string to Buffer
   */
  private bigIntToBuffer(value: string): Buffer {
    // Check if it's already hex
    if (/^[0-9a-fA-F]+$/.test(value)) {
      const hex = value.length % 2 === 0 ? value : `0${value}`;
      return Buffer.from(hex, "hex");
    }

    // Convert decimal to hex
    const asBigInt = BigInt(value);
    let hex = asBigInt.toString(16);
    if (hex.length % 2 !== 0) {
      hex = `0${hex}`;
    }
    return Buffer.from(hex, "hex");
  }

  /**
   * Convert Buffer to base64url format (for JWK)
   */
  private toBase64Url(buf: Buffer): string {
    return buf
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  /**
   * Build RSA public key from Dahua format
   * 
   * Dahua format: "N:<hex>,E:<hex>"
   * Example: "N:E17FA1E4150B8DB6...,E:010001"
   */
  private buildRsaPublicKey(pub: string) {
    const parts = pub.split(",");
    const nPart = parts.find((part) => part.startsWith("N:"));
    const ePart = parts.find((part) => part.startsWith("E:"));

    if (!nPart || !ePart) {
      throw new Error(`Invalid RSA public key format: ${pub}`);
    }

    const nValue = nPart.split(":")[1];
    const eValue = ePart.split(":")[1];
    const nBuffer = this.bigIntToBuffer(nValue);
    const eBuffer = this.bigIntToBuffer(eValue);

    // Create public key using JWK format
    return createPublicKey({
      key: {
        kty: "RSA",
        n: this.toBase64Url(nBuffer),
        e: this.toBase64Url(eBuffer),
      },
      format: "jwk",
    });
  }

  // ==========================================================================
  // Encryption Methods (RPAC-256)
  // ==========================================================================

  /**
   * Select encryption mode based on device capabilities
   * 
   * Based on reverse engineering of saveEncrypt function:
   * ```javascript
   * var b = {
   *   RPAC: { randLen: 32, mode: "CBC" },
   *   AES: { randLen: 16, mode: "ECB" }
   * };
   * ```
   */
  private selectEncryptMode(cipherList: string[]): EncryptMode {
    if (cipherList.includes("RPAC")) {
      return { type: "RPAC", randLen: 32, mode: "CBC" };
    }
    if (cipherList.includes("AES")) {
      return { type: "AES", randLen: 16, mode: "ECB" };
    }
    throw new Error(`Unsupported cipher list: ${cipherList.join(",")}`);
  }

  /**
   * Pad data with zeros to block size (16 bytes for AES)
   * 
   * Based on reverse engineering - Dahua uses ZeroPadding:
   * ```javascript
   * padding: CryptoJS.pad.ZeroPadding
   * ```
   */
  private padZero(data: Buffer, blockSize: number = 16): Buffer {
    const remainder = data.length % blockSize;
    if (remainder === 0) {
      return data;
    }
    const padding = Buffer.alloc(blockSize - remainder, 0x00);
    return Buffer.concat([data, padding]);
  }

  /**
   * Remove zero padding from decrypted data
   */
  private unpadZero(data: Buffer): Buffer {
    let end = data.length;
    while (end > 0 && data[end - 1] === 0x00) {
      end--;
    }
    return data.slice(0, end);
  }

  /**
   * Encrypt content for secure RPC calls
   * 
   * Based on reverse engineering of EncryptInfo function:
   * ```javascript
   * function(a, b, c) {
   *   var j = RandomNum(a);  // Generate random AES key
   *   var k = new RSAKey();
   *   k.setPublic(g.N, g.E);
   *   var l = k.encrypt(j);  // RSA encrypt the AES key
   *   var m = CryptoJS.enc.Utf8.parse(j);
   *   var n = CryptoJS.AES.encrypt(
   *     CryptoJS.enc.Utf8.parse(JSON.stringify(d)),
   *     m,
   *     {
   *       iv: CryptoJS.enc.Utf8.parse("0000000000000000"),
   *       mode: CryptoJS.mode[b],
   *       padding: CryptoJS.pad.ZeroPadding
   *     }
   *   );
   *   return {
   *     cipher: e + "-" + 8 * a,  // e.g., "RPAC-256"
   *     salt: l,                   // RSA encrypted key (hex)
   *     key: m,                    // AES key
   *     content: n.toString()      // AES encrypted content (base64)
   *   };
   * }
   * ```
   */
  private encryptContent(
    data: Record<string, unknown>,
    encryptInfo: DahuaEncryptInfo
  ): EncryptedContent {
    // Select encryption mode
    const mode = this.selectEncryptMode(encryptInfo.cipher);
    
    // Generate random AES key
    const keyString = this.generateRandomKey(mode.randLen);
    const keyBuffer = Buffer.from(keyString, "utf8");
    
    // IV is always "0000000000000000" (16 zeros as UTF-8)
    const iv = Buffer.from("0000000000000000", "utf8");

    // Select algorithm based on mode
    // RPAC with 32-byte key = AES-256-CBC
    // AES with 16-byte key = AES-128-ECB
    const algorithm = mode.type === "RPAC" ? "aes-256-cbc" : "aes-128-ecb";
    
    // Create cipher
    const cipher = createCipheriv(algorithm, keyBuffer, mode.mode === "ECB" ? Buffer.alloc(0) : iv);
    cipher.setAutoPadding(false);

    // Encrypt the JSON data
    const plaintext = Buffer.from(JSON.stringify(data), "utf8");
    const padded = this.padZero(plaintext);
    const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);

    // RSA encrypt the AES key
    const rsaKey = this.buildRsaPublicKey(encryptInfo.pub);
    const encryptedKey = publicEncrypt(
      { key: rsaKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(keyString, "utf8")
    );

    return {
      salt: encryptedKey.toString("hex"),
      cipher: `${mode.type}-${mode.randLen * 8}`,
      content: encrypted.toString("base64"),
      key: keyBuffer,
      mode: mode.mode,
    };
  }

  /**
   * Decrypt response content
   * 
   * Based on reverse engineering of UnEncryptInfo function:
   * ```javascript
   * function(a, b) {
   *   var c = CryptoJS.AES.decrypt(b, a, {
   *     iv: CryptoJS.enc.Utf8.parse("0000000000000000"),
   *     mode: CryptoJS.mode[this.encryptMode.info.mode],
   *     padding: CryptoJS.pad.ZeroPadding
   *   });
   *   return JSON.parse(CryptoJS.enc.Utf8.stringify(c));
   * }
   * ```
   */
  private decryptContent(
    key: Buffer,
    mode: "CBC" | "ECB",
    content: string
  ): unknown {
    const iv = Buffer.from("0000000000000000", "utf8");
    const algorithm = mode === "CBC" ? "aes-256-cbc" : "aes-128-ecb";
    
    const decipher = createDecipheriv(
      algorithm,
      key,
      mode === "ECB" ? Buffer.alloc(0) : iv
    );
    decipher.setAutoPadding(false);

    const encrypted = Buffer.from(content, "base64");
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    // Remove zero padding and parse JSON
    const unpadded = this.unpadZero(decrypted);
    
    try {
      return JSON.parse(unpadded.toString("utf8"));
    } catch {
      // Fallback to latin1 encoding if UTF-8 fails
      return JSON.parse(unpadded.toString("latin1"));
    }
  }

  // ==========================================================================
  // RPC Methods
  // ==========================================================================

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
   * Fetch encryption info from device
   * 
   * Calls Security.getEncryptInfo to get RSA public key and supported ciphers
   */
  private async fetchEncryptInfo(): Promise<DahuaEncryptInfo> {
    if (this.encryptInfo) {
      return this.encryptInfo;
    }

    const response = (await this.sendRpc(
      "Security.getEncryptInfo",
      {},
      "/RPC2",
      this.session?.sessionId
    )) as {
      result: boolean;
      params?: DahuaEncryptInfo;
    };

    if (!response.params) {
      throw new Error("Failed to fetch encryption info from device");
    }

    this.encryptInfo = response.params;
    this.encryptMode = this.selectEncryptMode(response.params.cipher);
    
    return response.params;
  }

  /**
   * Send encrypted RPC request
   * 
   * Used for sensitive operations like setting camera credentials
   */
  private async sendEncryptedRpc(
    method: string,
    payload: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.session) {
      throw new Error("Not logged in");
    }

    // Get encryption info
    const encryptInfo = await this.fetchEncryptInfo();
    
    // If device doesn't support asymmetric encryption, fall back to plain RPC
    if (!encryptInfo.asymmetric) {
      return this.sendRpc(method, payload, "/RPC2", this.session.sessionId);
    }

    // Encrypt the payload
    const encrypted = this.encryptContent(payload, encryptInfo);

    // Send encrypted request
    const response = (await this.sendRpc(
      method,
      {
        salt: encrypted.salt,
        cipher: encrypted.cipher,
        content: encrypted.content,
      },
      "/RPC2",
      this.session.sessionId
    )) as {
      result: boolean;
      params?: { content?: string };
    };

    // Decrypt response if it contains encrypted content
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

  // ==========================================================================
  // Authentication Methods
  // ==========================================================================

  /**
   * Calculate the password hash using Dahua's digest algorithm
   * 
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

  // ==========================================================================
  // Public API
  // ==========================================================================

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

      // Reset encryption info for new session
      this.encryptInfo = null;
      this.encryptMode = null;

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
      this.encryptInfo = null;
      this.encryptMode = null;
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
   * Update camera configuration using secure encrypted RPC
   * 
   * This method uses LogicDeviceManager.secSetCamera which requires
   * RPAC-256 encryption (RSA + AES-256-CBC).
   * 
   * @param cameras - Camera object or array of camera objects to update
   * @returns RPC response with decrypted params
   * 
   * @example
   * ```typescript
   * // Get current camera config first
   * const cameras = await client.rpc("LogicDeviceManager.getCameraAll", {});
   * 
   * // Modify the camera you want to update
   * const camera = cameras.params.camera[0];
   * camera.DeviceInfo.Address = "192.168.1.100";
   * 
   * // Update the camera
   * await client.setCamera(camera);
   * ```
   */
  async setCamera(
    cameras: Record<string, unknown> | Array<Record<string, unknown>>
  ): Promise<unknown> {
    const cameraList = Array.isArray(cameras) ? cameras : [cameras];
    return this.sendEncryptedRpc("LogicDeviceManager.secSetCamera", {
      cameras: cameraList,
    });
  }

  /**
   * Send a generic RPC command (must be logged in)
   * 
   * @param method - RPC method name (e.g., "magicBox.getDeviceType")
   * @param params - Optional parameters for the RPC call
   * @returns RPC response
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
