import { z } from "@hono/zod-openapi";

export const RpcRequestSchema = z
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

export const RpcResponseSchema = z
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

export const HealthResponseSchema = z
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
