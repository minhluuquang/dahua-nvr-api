import { z } from "@hono/zod-openapi";

export const StreamStartRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
    channel: z
      .number()
      .int()
      .min(0)
      .openapi({ example: 0, description: "Camera channel number" }),
    subtype: z
      .number()
      .int()
      .min(0)
      .max(1)
      .optional()
      .openapi({ example: 0, description: "Stream subtype (0=main, 1=sub)" }),
  })
  .openapi("StreamStartRequest");

export const StreamStartResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    streamId: z.string().openapi({ example: "7a1f1a12-3c42-4e38-9c9f-8f7a9f1cb2a0" }),
    wsUrl: z.string().openapi({
      example: "ws://localhost:3000/api/streams/stream-id/ws",
    }),
  })
  .openapi("StreamStartResponse");

export const StreamStopResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "Stream stopped" }),
  })
  .openapi("StreamStopResponse");

export const StreamSdpResponseSchema = z
  .string()
  .openapi({
    example: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=Live\r\nt=0 0",
  });

export const HlsStartRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
    channel: z
      .number()
      .int()
      .min(0)
      .openapi({ example: 0, description: "Camera channel number" }),
    subtype: z
      .number()
      .int()
      .min(0)
      .max(1)
      .optional()
      .openapi({ example: 0, description: "Stream subtype (0=main, 1=sub)" }),
    rtspPort: z
      .number()
      .int()
      .min(1)
      .max(65535)
      .optional()
      .openapi({ example: 80, description: "RTSP port override" }),
  })
  .openapi("HlsStartRequest");

export const HlsStartResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    streamId: z.string().openapi({ example: "hls-stream-id" }),
    playlistUrl: z.string().openapi({
      example: "http://localhost:3000/api/streams/hls/hls-stream-id/index.m3u8",
    }),
  })
  .openapi("HlsStartResponse");

export const HlsStopResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: "HLS stream stopped" }),
  })
  .openapi("HlsStopResponse");

export const StreamIdParamSchema = z
  .object({
    id: z.string().min(1).openapi({ example: "stream-id" }),
  })
  .openapi("StreamIdParam");

export const HlsFileParamSchema = z
  .object({
    id: z.string().min(1).openapi({ example: "stream-id" }),
    file: z.string().min(1).openapi({ example: "index.m3u8" }),
  })
  .openapi("HlsFileParam");
