/**
 * Remote device info from Dahua NVR configuration
 */
export interface RemoteDeviceInfo {
  Address: string;
  Port: number;
  HttpPort: number;
  HttpsPort: number;
  RtspPort: number;
  DeviceType: string;
  Name: string;
  SerialNo: string;
  Vendor: string;
  ProtocolType: string;
  UserName: string;
  Version: string;
  Enable: boolean;
  VideoInputChannels?: number;
  AudioInputChannels?: number;
  AlarmInChannels?: number;
  Mac?: string;
}

/**
 * Camera connection state from LogicDeviceManager
 */
export interface CameraState {
  channel: number;
  connectionState?: string;
}

/**
 * Parsed camera data for API response
 */
export interface ParsedCamera {
  channel: number;
  address: string;
  port: number;
  httpPort: number;
  httpsPort: number;
  rtspPort: number;
  deviceType: string;
  name: string;
  serialNo: string;
  vendor: string;
  protocolType: string;
  userName: string;
  version: string;
  connectionState?: string;
  enabled: boolean;
  videoInputChannels?: number;
  audioInputChannels?: number;
  alarmInChannels?: number;
}

/**
 * Parse camera data from Dahua device config and states
 *
 * Combines RemoteDevice configuration with camera connection states
 * to produce a unified camera list.
 */
export function parseCameraData(
  deviceConfig: Record<string, RemoteDeviceInfo>,
  cameraStates: CameraState[]
): ParsedCamera[] {
  const cameras: ParsedCamera[] = [];
  const stateMap = new Map(cameraStates.map((s) => [s.channel, s.connectionState]));

  // Sort keys to maintain channel order
  const sortedKeys = Object.keys(deviceConfig).sort((a, b) => {
    const numA = parseInt(a.match(/\d+$/)?.[0] || "0");
    const numB = parseInt(b.match(/\d+$/)?.[0] || "0");
    return numA - numB;
  });

  for (const key of sortedKeys) {
    const match = key.match(/(\d+)$/);
    if (!match) continue;

    const channel = parseInt(match[1]);
    const device = deviceConfig[key];

    // Only include enabled cameras or cameras with valid addresses
    if (!device.Enable && device.Address === "192.168.0.0") continue;

    cameras.push({
      channel,
      address: device.Address,
      port: device.Port,
      httpPort: device.HttpPort,
      httpsPort: device.HttpsPort,
      rtspPort: device.RtspPort,
      deviceType: device.DeviceType,
      name: device.Name,
      serialNo: device.SerialNo,
      vendor: device.Vendor,
      protocolType: device.ProtocolType,
      userName: device.UserName,
      version: device.Version,
      connectionState: stateMap.get(channel),
      enabled: device.Enable,
      videoInputChannels: device.VideoInputChannels,
      audioInputChannels: device.AudioInputChannels,
      alarmInChannels: device.AlarmInChannels,
    });
  }

  return cameras;
}
