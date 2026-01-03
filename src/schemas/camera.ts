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

export const CameraAllVideoInputSchema = z
  .object({
    BufDelay: z.number().optional(),
    Enable: z.boolean().optional(),
    ExtraStreamUrl: z.string().optional(),
    MainStreamUrl: z.string().optional(),
    Name: z.string().optional(),
    ServiceType: z.string().optional(),
  })
  .passthrough()
  .openapi("CameraAllVideoInput");

export const CameraAllDeviceInfoSchema = z
  .object({
    Address: z.string().optional(),
    AudioInputChannels: z.number().optional(),
    DeviceClass: z.string().optional(),
    DeviceType: z.string().optional(),
    Enable: z.boolean().optional(),
    Encryption: z.number().optional(),
    HttpPort: z.number().optional(),
    HttpsPort: z.number().optional(),
    Mac: z.string().optional(),
    Name: z.string().optional(),
    PoE: z.boolean().optional(),
    PoEPort: z.number().optional(),
    Port: z.number().optional(),
    ProtocolType: z.string().optional(),
    RtspPort: z.number().optional(),
    SerialNo: z.string().optional(),
    UserName: z.string().optional(),
    Password: z.string().optional(),
    VideoInputChannels: z.number().optional(),
    VideoInputs: z.array(CameraAllVideoInputSchema).optional(),
  })
  .passthrough()
  .openapi("CameraAllDeviceInfo");

export const CameraAllItemSchema = z
  .object({
    Channel: z.number().optional(),
    DeviceID: z.string().optional(),
    DeviceInfo: CameraAllDeviceInfoSchema.optional(),
    Enable: z.boolean().optional(),
    Type: z.string().optional(),
    UniqueChannel: z.number().optional(),
    VideoStandard: z.string().optional(),
    VideoStream: z.string().optional(),
  })
  .passthrough()
  .openapi("CameraAllItem");

export const CameraAllResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
    cameras: z.array(CameraAllItemSchema),
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
    camera: CameraAllItemSchema.openapi({
      description: "Full camera object to update",
    }),
  })
  .openapi("CameraUpdateRequest", {
    example: {
      session: "abc123def456",
      camera: {
        Channel: 0,
        DeviceID: "uuid:System_CONFIG_NETCAMERA_INFO_0",
        DeviceInfo: {
          Address: "192.168.1.221",
          AudioInputChannels: 1,
          DeviceClass: "IPC",
          DeviceType: "IPC-F22-D",
          Enable: true,
          Encryption: 0,
          HttpPort: 80,
          HttpsPort: 443,
          Mac: "ff:ff:ff:ff:ff:ff",
          Name: "7H07AB1RAZ64978",
          PoE: false,
          PoEPort: 0,
          Port: 37777,
          ProtocolType: "Private",
          RtspPort: 0,
          SerialNo: "7H07AB1RAZ64978",
          UserName: "admin",
          VideoInputChannels: 1,
          VideoInputs: [
            {
              BufDelay: 160,
              Enable: true,
              ExtraStreamUrl: "",
              MainStreamUrl: "",
              Name: "",
              ServiceType: "AUTO",
            },
          ],
          Password: "",
          LoginType: 0,
          b_isMultiVideoSensor: false,
        },
        Enable: true,
        Type: "Remote",
        UniqueChannel: 0,
        VideoStandard: "PAL",
        VideoStream: "Main",
        showStatus: "Connected",
      },
    },
  });
