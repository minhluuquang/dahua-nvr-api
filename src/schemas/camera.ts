import { z } from "@hono/zod-openapi";

export const CameraSchema = z
  .object({
    channel: z.number().openapi({ example: 0, description: "Camera channel number" }),
    address: z.string().openapi({ example: "192.168.1.221", description: "Camera IP address" }),
    port: z.number().openapi({ example: 37777, description: "Camera TCP port" }),
    httpPort: z.number().openapi({ example: 80, description: "Camera HTTP port" }),
    httpsPort: z.number().openapi({ example: 443, description: "Camera HTTPS port" }),
    rtspPort: z.number().openapi({ example: 554, description: "Camera RTSP port" }),
    deviceType: z.string().openapi({ example: "IPC-C22E-D", description: "Camera model" }),
    name: z.string().openapi({ example: "7J03FF4RAZ0B83E", description: "Camera name" }),
    serialNo: z.string().openapi({ example: "7J03FF4RAZ0B83E", description: "Camera serial number" }),
    vendor: z.string().openapi({ example: "Private", description: "Camera manufacturer" }),
    protocolType: z.string().openapi({ example: "Dahua2", description: "Protocol type" }),
    userName: z.string().openapi({ example: "admin", description: "Camera username" }),
    version: z.string().openapi({ example: "2.800.0000000.3.R,2021-10-26", description: "Firmware version" }),
    connectionState: z.string().optional().openapi({ example: "Connected", description: "Connection status" }),
    enabled: z.boolean().openapi({ example: true, description: "Whether camera is enabled" }),
    videoInputChannels: z.number().optional().openapi({ example: 1, description: "Number of video input channels" }),
    audioInputChannels: z.number().optional().openapi({ example: 1, description: "Number of audio input channels" }),
    alarmInChannels: z.number().optional().openapi({ example: 0, description: "Number of alarm input channels" }),
  })
  .openapi("Camera");

export const CameraListResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    cameras: z.array(CameraSchema).openapi({ description: "List of cameras" }),
    total: z.number().openapi({ example: 4, description: "Total number of cameras" }),
  })
  .openapi("CameraListResponse");

export const CameraAllResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    cameras: z.array(z.record(z.string(), z.unknown())),
  })
  .openapi("CameraAllResponse");

export const CameraDetailResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    camera: CameraSchema,
  })
  .openapi("CameraDetailResponse");

export const CameraUpdateRequestSchema = z
  .object({
    session: z
      .string()
      .min(1)
      .openapi({ example: "abc123def456", description: "Session ID from login" }),
    camera: z
      .record(z.string(), z.unknown())
      .openapi({ description: "Full camera object to update" }),
  })
  .openapi("CameraUpdateRequest");
