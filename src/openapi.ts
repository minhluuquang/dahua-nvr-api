import { swaggerUI } from "@hono/swagger-ui";
import { app } from "./app";

/**
 * Configure OpenAPI documentation
 */
export function configureOpenAPI() {
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
      { name: "Streams", description: "Live streaming endpoints" },
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
}
