import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Create OpenAPI-enabled Hono app
const app = new OpenAPIHono();

// Middleware
app.use("*", logger());
app.use("*", cors());

export { app };
