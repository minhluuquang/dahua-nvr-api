import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    success: z.boolean().openapi({ example: false }),
    error: z.string().openapi({ example: "Error message" }),
  })
  .openapi("Error");

export const SessionRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
  })
  .openapi("SessionRequest");

export const SessionQuerySchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
  })
  .openapi("SessionQuery");

export const ChannelParamSchema = z
  .object({
    channel: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .openapi({ example: "0", description: "Camera channel number" }),
  })
  .openapi("ChannelParam");
