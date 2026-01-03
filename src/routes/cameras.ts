import { createRoute } from "@hono/zod-openapi";
import { app } from "../app";
import { getSession } from "../services/session";
import {
  parseCameraData,
  RemoteDeviceInfo,
  CameraState,
} from "../services/camera";
import {
  ErrorSchema,
  SessionQuerySchema,
  ChannelParamSchema,
  CameraListResponseSchema,
  CameraAllResponseSchema,
  CameraDetailResponseSchema,
  CameraUpdateRequestSchema,
  RpcResponseSchema,
} from "../schemas";

// Camera list route
const camerasRoute = createRoute({
  method: "get",
  path: "/api/cameras",
  tags: ["Cameras"],
  summary: "List all cameras",
  description:
    "Returns a list of all cameras connected to the NVR with their connection states and configuration details.",
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

export function registerCameraRoutes() {
  app.openapi(camerasRoute, async (c) => {
    try {
      const { session } = c.req.valid("query");

      const client = getSession(session);
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

      const client = getSession(session);
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

      const client = getSession(session);
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

      const client = getSession(session);
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
        typeof payload.UniqueChannel === "number" &&
        payload.UniqueChannel !== channel
      ) {
        return c.json(
          {
            success: false,
            error: "UniqueChannel mismatch between path and payload",
          },
          400
        );
      }

      if (
        typeof payload.Channel === "number" &&
        payload.UniqueChannel === undefined &&
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

      if (payload.UniqueChannel === undefined) {
        payload.UniqueChannel = channel;
      }

      if (payload.Channel === undefined) {
        payload.Channel = channel;
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
}
