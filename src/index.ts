import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { app } from "./app";
import { configureOpenAPI } from "./openapi";
import { registerRoutes } from "./routes";
import { streamManager } from "./services/streams";

// Register all routes
registerRoutes();

// Configure OpenAPI documentation
configureOpenAPI();

// Start server
const port = parseInt(process.env.PORT || "3000");
console.log(`Starting Dahua Camera API server on port ${port}...`);
console.log(`Swagger UI available at http://localhost:${port}/swagger`);
console.log(`OpenAPI spec available at http://localhost:${port}/doc`);

const server = serve({
  fetch: app.fetch,
  port,
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const host = req.headers.host;
  if (!host) {
    socket.destroy();
    return;
  }

  const url = new URL(req.url || "", `http://${host}`);
  const match = url.pathname.match(/^\/api\/streams\/([^/]+)\/ws$/);
  if (!match) {
    socket.destroy();
    return;
  }

  const streamId = match[1];
  wss.handleUpgrade(req, socket, head, (ws) => {
    const ok = streamManager.addSubscriber(streamId, ws);
    if (!ok) {
      ws.close(1008, "Stream not found");
    }
  });
});

console.log(`Server is running at http://localhost:${port}`);
