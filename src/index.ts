import { serve } from "@hono/node-server";
import { app } from "./app";
import { configureOpenAPI } from "./openapi";
import { registerRoutes } from "./routes";

// Register all routes
registerRoutes();

// Configure OpenAPI documentation
configureOpenAPI();

// Start server
const port = parseInt(process.env.PORT || "3000");
console.log(`Starting Dahua Camera API server on port ${port}...`);
console.log(`Swagger UI available at http://localhost:${port}/swagger`);
console.log(`OpenAPI spec available at http://localhost:${port}/doc`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server is running at http://localhost:${port}`);
