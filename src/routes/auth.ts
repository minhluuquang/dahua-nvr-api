import { createRoute } from "@hono/zod-openapi";
import { app } from "../app";
import { DahuaClient } from "../dahua-client";
import { getSession, setSession, deleteSession } from "../services/session";
import {
  ErrorSchema,
  SessionRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  KeepAliveResponseSchema,
} from "../schemas";

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

export function registerAuthRoutes() {
  app.openapi(loginRoute, async (c) => {
    try {
      const { host, username, password } = c.req.valid("json");

      const client = new DahuaClient(host);
      const result = await client.login(username, password);

      if (result.success && result.session) {
        setSession(result.session, client);

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

      await client.logout();
      deleteSession(session);

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
}
