import { createRoute } from "@hono/zod-openapi";
import { app } from "../app";
import { getSession } from "../services/session";
import { ErrorSchema, RpcRequestSchema, RpcResponseSchema } from "../schemas";

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

export function registerRpcRoutes() {
  app.openapi(rpcRoute, async (c) => {
    try {
      const { session, method, params = {} } = c.req.valid("json");

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
}
