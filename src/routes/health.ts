import { createRoute } from "@hono/zod-openapi";
import { app } from "../app";
import { HealthResponseSchema } from "../schemas";

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

export function registerHealthRoutes() {
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
        "POST /api/streams/start": "Start a live stream",
        "POST /api/streams/:id/stop": "Stop a live stream",
        "GET /api/streams/:id/ws": "WebSocket for RTP packets",
        "GET /api/streams/:id/sdp": "Get SDP for a stream",
        "POST /api/streams/hls/start": "Start an HLS stream",
        "POST /api/streams/hls/:id/stop": "Stop an HLS stream",
        "GET /api/streams/hls/:id/:file": "Get HLS playlist/segment",
        "GET /player/hls/:id": "Built-in HLS player page",
      },
    });
  });
}
