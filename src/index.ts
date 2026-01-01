import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { DahuaClient } from "./dahua-client";

// Create OpenAPI-enabled Hono app
const app = new OpenAPIHono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Store active sessions (in production, use Redis or similar)
const activeSessions = new Map<string, DahuaClient>();

// ============================================================================
// Schema Definitions
// ============================================================================

const ErrorSchema = z
  .object({
    success: z.boolean().openapi({ example: false }),
    error: z.string().openapi({ example: "Error message" }),
  })
  .openapi("Error");

const LoginRequestSchema = z
  .object({
    host: z
      .string()
      .url()
      .openapi({ example: "http://192.168.1.100", description: "Dahua device URL" }),
    username: z
      .string()
      .min(1)
      .openapi({ example: "admin", description: "Username" }),
    password: z
      .string()
      .min(1)
      .openapi({ example: "password123", description: "Password" }),
  })
  .openapi("LoginRequest");

const LoginResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    session: z.string().openapi({ example: "abc123def456" }),
    keepAliveInterval: z.number().openapi({ example: 60 }),
    message: z.string().openapi({ example: "Login successful" }),
  })
  .openapi("LoginResponse");

const SessionRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
  })
  .openapi("SessionRequest");

const LogoutResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "Logged out successfully" }),
  })
  .openapi("LogoutResponse");

const KeepAliveResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "Session kept alive" }),
  })
  .openapi("KeepAliveResponse");

const RpcRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
    method: z
      .string()
      .min(1)
      .openapi({ example: "magicBox.getDeviceType", description: "RPC method name" }),
    params: z
      .record(z.string(), z.unknown())
      .optional()
      .openapi({ example: {}, description: "Optional parameters for the RPC call" }),
  })
  .openapi("RpcRequest");

const RpcResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    data: z.unknown().openapi({
      example: {
        id: 1,
        params: { type: "DHI-NVR1108HS-S3/H" },
        result: true,
        session: "abc123def456",
      },
    }),
  })
  .openapi("RpcResponse");

const CameraSchema = z
  .object({
    channel: z.number().openapi({ example: 0, description: "Camera channel number" }),
    address: z.string().openapi({ example: "192.168.1.221", description: "Camera IP address" }),
    port: z.number().openapi({ example: 37777, description: "Camera TCP port" }),
    httpPort: z.number().openapi({ example: 80, description: "Camera HTTP port" }),
    httpsPort: z.number().openapi({ example: 443, description: "Camera HTTPS port" }),
    rtspPort: z.number().openapi({ example: 554, description: "Camera RTSP port" }),
    deviceType: z.string().openapi({ example: "IPC-C22E-D", description: "Camera model" }),
    name: z.string().openapi({ example: "7J03FF4RAZ0B83E", description: "Camera name" }),
    serialNo: z.string().openapi({ example: "7J03FF4RAZ0B83E", description: "Camera serial number" }),
    vendor: z.string().openapi({ example: "Private", description: "Camera manufacturer" }),
    protocolType: z.string().openapi({ example: "Dahua2", description: "Protocol type" }),
    userName: z.string().openapi({ example: "admin", description: "Camera username" }),
    version: z.string().openapi({ example: "2.800.0000000.3.R,2021-10-26", description: "Firmware version" }),
    connectionState: z.string().optional().openapi({ example: "Connected", description: "Connection status" }),
    enabled: z.boolean().openapi({ example: true, description: "Whether camera is enabled" }),
    videoInputChannels: z.number().optional().openapi({ example: 1, description: "Number of video input channels" }),
    audioInputChannels: z.number().optional().openapi({ example: 1, description: "Number of audio input channels" }),
    alarmInChannels: z.number().optional().openapi({ example: 0, description: "Number of alarm input channels" }),
  })
  .openapi("Camera");

const CameraListResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    cameras: z.array(CameraSchema).openapi({ description: "List of cameras" }),
    total: z.number().openapi({ example: 4, description: "Total number of cameras" }),
  })
  .openapi("CameraListResponse");

const CameraAllResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    cameras: z.array(z.record(z.string(), z.unknown())),
  })
  .openapi("CameraAllResponse");

const CameraDetailResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    camera: CameraSchema,
  })
  .openapi("CameraDetailResponse");

const CameraUpdateRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
    camera: z
      .record(z.string(), z.unknown())
      .openapi({ description: "Full camera object to update" }),
  })
  .openapi("CameraUpdateRequest");

const SessionQuerySchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
  })
  .openapi("SessionQuery");

const ChannelParamSchema = z
  .object({
    channel: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .openapi({ example: "0", description: "Camera channel number" }),
  })
  .openapi("ChannelParam");

const HealthResponseSchema = z
  .object({
    name: z.string().openapi({ example: "Dahua Camera API" }),
    version: z.string().openapi({ example: "1.0.0" }),
    endpoints: z.record(z.string(), z.string()).openapi({
      example: {
        "POST /api/login": "Login to a Dahua device",
      },
    }),
  })
  .openapi("HealthResponse");

// ============================================================================
// Route Definitions
// ============================================================================

// Health check route
const healthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check",
  description: "Returns API information and available endpoints",
  responses: {
    200: {
      description: "API is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
  },
});

// Login route
const loginRoute = createRoute({
  method: "post",
  path: "/api/login",
  tags: ["Authentication"],
  summary: "Login to Dahua device",
  description:
    "Authenticates with a Dahua NVR/Camera using challenge-response authentication. Returns a session ID for subsequent requests.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: LoginResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing required fields",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "Authentication failed",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Logout route
const logoutRoute = createRoute({
  method: "post",
  path: "/api/logout",
  tags: ["Authentication"],
  summary: "Logout from Dahua device",
  description: "Ends the session with the Dahua device",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Logout successful",
      content: {
        "application/json": {
          schema: LogoutResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing session",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Keep alive route
const keepAliveRoute = createRoute({
  method: "post",
  path: "/api/keepalive",
  tags: ["Session"],
  summary: "Keep session alive",
  description:
    "Sends a keep-alive signal to prevent session timeout. Should be called periodically based on keepAliveInterval from login response.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SessionRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Keep alive successful",
      content: {
        "application/json": {
          schema: KeepAliveResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing session",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// RPC route
const rpcRoute = createRoute({
  method: "post",
  path: "/api/rpc",
  tags: ["RPC"],
  summary: "Send RPC command",
  description: `Send a generic RPC command to the Dahua device. 
  
Common methods include:
- \`magicBox.getDeviceType\` - Get device model
- \`magicBox.getSerialNo\` - Get serial number
- \`magicBox.getSoftwareVersion\` - Get firmware version
- \`configManager.getConfig\` - Get configuration (requires params: {name: "ConfigName"})
- \`LogicDeviceManager.getCameraAll\` - Get all cameras
- \`global.getCurrentTime\` - Get device time`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: RpcRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "RPC call successful",
      content: {
        "application/json": {
          schema: RpcResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing required fields",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Camera list route
const camerasRoute = createRoute({
  method: "get",
  path: "/api/cameras",
  tags: ["Cameras"],
  summary: "List all cameras",
  description: "Returns a list of all cameras connected to the NVR with their connection states and configuration details.",
  request: {
    query: SessionQuerySchema,
  },
  responses: {
    200: {
      description: "Camera list retrieved successfully",
      content: {
        "application/json": {
          schema: CameraListResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing session",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Full camera payload route
const camerasAllRoute = createRoute({
  method: "get",
  path: "/api/cameras/all",
  tags: ["Cameras"],
  summary: "Get full camera payload",
  description:
    "Returns the raw LogicDeviceManager.getCameraAll payload for each camera.",
  request: {
    query: SessionQuerySchema,
  },
  responses: {
    200: {
      description: "Camera payload retrieved successfully",
      content: {
        "application/json": {
          schema: CameraAllResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing session",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Camera detail route
const cameraDetailRoute = createRoute({
  method: "get",
  path: "/api/cameras/{channel}",
  tags: ["Cameras"],
  summary: "Get camera details",
  description: "Returns detailed information for a specific camera channel.",
  request: {
    params: ChannelParamSchema,
    query: SessionQuerySchema,
  },
  responses: {
    200: {
      description: "Camera details retrieved successfully",
      content: {
        "application/json": {
          schema: CameraDetailResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing session or invalid channel",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session or camera not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// Camera update route
const cameraUpdateRoute = createRoute({
  method: "put",
  path: "/api/cameras/{channel}",
  tags: ["Cameras"],
  summary: "Update camera configuration",
  description:
    "Updates a camera using the secure LogicDeviceManager.secSetCamera RPC. The request must include the full camera object.",
  request: {
    params: ChannelParamSchema,
    body: {
      content: {
        "application/json": {
          schema: CameraUpdateRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Camera updated successfully",
      content: {
        "application/json": {
          schema: RpcResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request - missing session or camera payload",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

// ============================================================================
// Route Handlers
// ============================================================================

app.openapi(healthRoute, (c) => {
  return c.json({
    name: "Dahua Camera API",
    version: "1.0.0",
    endpoints: {
      "POST /api/login": "Login to a Dahua device",
      "POST /api/logout": "Logout from a Dahua device",
      "POST /api/keepalive": "Keep session alive",
      "POST /api/rpc": "Send RPC command to device",
      "GET /api/cameras": "List all cameras with connection states",
      "GET /api/cameras/all": "Get raw camera payloads",
      "GET /api/cameras/:channel": "Get details for a specific camera",
      "PUT /api/cameras/:channel": "Update camera configuration",
    },
  });
});

app.openapi(loginRoute, async (c) => {
  try {
    const { host, username, password } = c.req.valid("json");

    const client = new DahuaClient(host);
    const result = await client.login(username, password);

    if (result.success && result.session) {
      activeSessions.set(result.session, client);

      return c.json(
        {
          success: true,
          session: result.session,
          keepAliveInterval: result.keepAliveInterval || 60,
          message: "Login successful",
        },
        200
      );
    }

    return c.json(
      {
        success: false,
        error: result.error || "Login failed",
      },
      401
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

app.openapi(logoutRoute, async (c) => {
  try {
    const { session } = c.req.valid("json");

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    await client.logout();
    activeSessions.delete(session);

    return c.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

app.openapi(keepAliveRoute, async (c) => {
  try {
    const { session } = c.req.valid("json");

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    const alive = await client.keepAlive();
    return c.json(
      {
        success: alive,
        message: alive ? "Session kept alive" : "Failed to keep session alive",
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

app.openapi(rpcRoute, async (c) => {
  try {
    const { session, method, params = {} } = c.req.valid("json");

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    const result = await client.rpc(method, params);
    return c.json(
      {
        success: true,
        data: result,
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

// Helper function to parse camera data
interface RemoteDeviceInfo {
  Address: string;
  Port: number;
  HttpPort: number;
  HttpsPort: number;
  RtspPort: number;
  DeviceType: string;
  Name: string;
  SerialNo: string;
  Vendor: string;
  ProtocolType: string;
  UserName: string;
  Version: string;
  Enable: boolean;
  VideoInputChannels?: number;
  AudioInputChannels?: number;
  AlarmInChannels?: number;
  Mac?: string;
}

interface CameraState {
  channel: number;
  connectionState?: string;
}

function parseCameraData(
  deviceConfig: Record<string, RemoteDeviceInfo>,
  cameraStates: CameraState[]
) {
  const cameras = [];
  const stateMap = new Map(cameraStates.map((s) => [s.channel, s.connectionState]));

  // Sort keys to maintain channel order
  const sortedKeys = Object.keys(deviceConfig).sort((a, b) => {
    const numA = parseInt(a.match(/\d+$/)?.[0] || "0");
    const numB = parseInt(b.match(/\d+$/)?.[0] || "0");
    return numA - numB;
  });

  for (const key of sortedKeys) {
    const match = key.match(/(\d+)$/);
    if (!match) continue;

    const channel = parseInt(match[1]);
    const device = deviceConfig[key];

    // Only include enabled cameras or cameras with valid addresses
    if (!device.Enable && device.Address === "192.168.0.0") continue;

    cameras.push({
      channel,
      address: device.Address,
      port: device.Port,
      httpPort: device.HttpPort,
      httpsPort: device.HttpsPort,
      rtspPort: device.RtspPort,
      deviceType: device.DeviceType,
      name: device.Name,
      serialNo: device.SerialNo,
      vendor: device.Vendor,
      protocolType: device.ProtocolType,
      userName: device.UserName,
      version: device.Version,
      connectionState: stateMap.get(channel),
      enabled: device.Enable,
      videoInputChannels: device.VideoInputChannels,
      audioInputChannels: device.AudioInputChannels,
      alarmInChannels: device.AlarmInChannels,
    });
  }

  return cameras;
}

app.openapi(camerasRoute, async (c) => {
  try {
    const { session } = c.req.valid("query");

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    // Fetch camera configuration
    const configResult = (await client.rpc("configManager.getConfig", {
      name: "RemoteDevice",
    })) as {
      result: boolean;
      params?: { table: Record<string, RemoteDeviceInfo> };
    };

    if (!configResult.result || !configResult.params?.table) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch camera configuration",
        },
        500
      );
    }

    // Fetch camera states
    const stateResult = (await client.rpc("LogicDeviceManager.getCameraState", {
      uniqueChannels: [-1],
    })) as {
      result: boolean;
      params?: { states: CameraState[] };
    };

    const cameraStates = stateResult.params?.states || [];
    const cameras = parseCameraData(configResult.params.table, cameraStates);

    return c.json(
      {
        success: true,
        cameras,
        total: cameras.length,
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

app.openapi(camerasAllRoute, async (c) => {
  try {
    const { session } = c.req.valid("query");

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    const result = (await client.rpc("LogicDeviceManager.getCameraAll", {})) as {
      params?: { camera?: Array<Record<string, unknown>> };
    };

    return c.json(
      {
        success: true,
        cameras: result.params?.camera || [],
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

app.openapi(cameraDetailRoute, async (c) => {
  try {
    const { session } = c.req.valid("query");
    const { channel } = c.req.valid("param");

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    // Fetch camera configuration
    const configResult = (await client.rpc("configManager.getConfig", {
      name: "RemoteDevice",
    })) as {
      result: boolean;
      params?: { table: Record<string, RemoteDeviceInfo> };
    };

    if (!configResult.result || !configResult.params?.table) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch camera configuration",
        },
        500
      );
    }

    // Fetch camera state for specific channel
    const stateResult = (await client.rpc("LogicDeviceManager.getCameraState", {
      uniqueChannels: [channel],
    })) as {
      result: boolean;
      params?: { states: CameraState[] };
    };

    const cameraStates = stateResult.params?.states || [];
    const cameras = parseCameraData(configResult.params.table, cameraStates);

    const camera = cameras.find((cam) => cam.channel === channel);
    if (!camera) {
      return c.json(
        {
          success: false,
          error: `Camera not found for channel ${channel}`,
        },
        404
      );
    }

    return c.json(
      {
        success: true,
        camera,
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

app.openapi(cameraUpdateRoute, async (c) => {
  try {
    const { channel } = c.req.valid("param");
    const { session, camera } = c.req.valid("json");

    if (!camera || Object.keys(camera).length === 0) {
      return c.json(
        {
          success: false,
          error: "Camera payload is required",
        },
        400
      );
    }

    const client = activeSessions.get(session);
    if (!client) {
      return c.json(
        {
          success: false,
          error: "Session not found",
        },
        404
      );
    }

    const payload = { ...camera } as Record<string, unknown>;
    if (
      typeof payload.Channel === "number" &&
      payload.Channel !== channel
    ) {
      return c.json(
        {
          success: false,
          error: "Channel mismatch between path and payload",
        },
        400
      );
    }

    if (payload.Channel === undefined) {
      payload.Channel = channel;
    }

    if (payload.UniqueChannel === undefined) {
      payload.UniqueChannel = channel;
    }

    const result = await client.setCamera(payload);
    return c.json(
      {
        success: true,
        data: result,
      },
      200
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

// ============================================================================
// OpenAPI Documentation
// ============================================================================

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Dahua Camera API",
    version: "1.0.0",
    description: `REST API for interacting with Dahua NVR/Camera devices.

## Authentication Flow

1. Call \`POST /api/login\` with device host, username, and password
2. Store the returned \`session\` ID
3. Use the session ID for all subsequent API calls
4. Call \`POST /api/keepalive\` periodically to prevent session timeout
5. Call \`POST /api/logout\` when done

## Security Note

This API implements the Dahua challenge-response authentication protocol:
- Phase 1: Request a challenge (random + realm)
- Phase 2: Send hashed password using MD5(username:random:MD5(username:realm:password))
`,
    contact: {
      name: "API Support",
    },
  },
  tags: [
    { name: "Health", description: "Health check endpoints" },
    { name: "Authentication", description: "Login and logout endpoints" },
    { name: "Session", description: "Session management endpoints" },
    { name: "Cameras", description: "Camera management endpoints" },
    { name: "RPC", description: "Remote Procedure Call endpoints" },
  ],
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
});

// Swagger UI
app.get("/swagger", swaggerUI({ url: "/doc" }));

// ============================================================================
// Start Server
// ============================================================================

const port = parseInt(process.env.PORT || "3000");
console.log(`Starting Dahua Camera API server on port ${port}...`);
console.log(`Swagger UI available at http://localhost:${port}/swagger`);
console.log(`OpenAPI spec available at http://localhost:${port}/doc`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running at http://localhost:${port}`);
