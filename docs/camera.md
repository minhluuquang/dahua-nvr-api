# Camera Operations

This document covers camera channel management, video settings, and snapshot operations.

## Overview

Dahua NVR/Camera devices support multiple camera channels. Each channel can be configured independently for resolution, encoding, and other video settings.

---

## REST API Endpoints

### List All Cameras

Retrieve information about all connected cameras with their connection states.

**Endpoint:** `GET /api/cameras`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session` | string | Yes | Session ID from login |

**Example Request:**

```bash
curl "http://localhost:3000/api/cameras?session=YOUR_SESSION_ID"
```

**Example Response:**

```json
{
  "success": true,
  "cameras": [
    {
      "channel": 0,
      "address": "192.168.1.221",
      "port": 37777,
      "httpPort": 80,
      "httpsPort": 443,
      "rtspPort": 554,
      "deviceType": "IPC-F22-D",
      "name": "7H07AB1RAZ64978",
      "serialNo": "7H07AB1RAZ64978",
      "vendor": "Private",
      "protocolType": "Dahua2",
      "userName": "admin",
      "version": "2.800.0000000.3.R,2021-10-26",
      "connectionState": "Connected",
      "enabled": true,
      "videoInputChannels": 1,
      "audioInputChannels": 1,
      "alarmInChannels": 0
    },
    {
      "channel": 1,
      "address": "192.168.1.222",
      "port": 37777,
      "httpPort": 80,
      "httpsPort": 443,
      "rtspPort": 554,
      "deviceType": "IPC-C22E-D",
      "name": "7J03FF4RAZ0B83E",
      "serialNo": "7J03FF4RAZ0B83E",
      "vendor": "Private",
      "protocolType": "Dahua2",
      "userName": "admin",
      "version": "2.800.0000000.3.R,2021-10-26",
      "connectionState": "Connected",
      "enabled": true,
      "videoInputChannels": 1,
      "audioInputChannels": 1,
      "alarmInChannels": 0
    }
  ],
  "total": 2
}
```

**Camera Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Camera channel number (0-based) |
| `address` | string | Camera IP address |
| `port` | number | Camera TCP port (typically 37777) |
| `httpPort` | number | Camera HTTP port (typically 80) |
| `httpsPort` | number | Camera HTTPS port (typically 443) |
| `rtspPort` | number | Camera RTSP port (typically 554) |
| `deviceType` | string | Camera model (e.g., "IPC-C22E-D") |
| `name` | string | Camera name/identifier |
| `serialNo` | string | Camera serial number |
| `vendor` | string | Camera manufacturer (e.g., "Private" for Dahua) |
| `protocolType` | string | Protocol type (e.g., "Dahua2", "Onvif") |
| `userName` | string | Username for camera authentication |
| `version` | string | Camera firmware version |
| `connectionState` | string | Connection status ("Connected" or undefined) |
| `enabled` | boolean | Whether the camera is enabled |
| `videoInputChannels` | number | Number of video input channels |
| `audioInputChannels` | number | Number of audio input channels |
| `alarmInChannels` | number | Number of alarm input channels |

---

### Get Camera Details

Retrieve detailed information for a specific camera channel.

**Endpoint:** `GET /api/cameras/{channel}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `channel` | number | Camera channel number (0-based) |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session` | string | Yes | Session ID from login |

**Example Request:**

```bash
curl "http://localhost:3000/api/cameras/0?session=YOUR_SESSION_ID"
```

**Example Response:**

```json
{
  "success": true,
  "camera": {
    "channel": 0,
    "address": "192.168.1.221",
    "port": 37777,
    "httpPort": 80,
    "httpsPort": 443,
    "rtspPort": 554,
    "deviceType": "IPC-F22-D",
    "name": "7H07AB1RAZ64978",
    "serialNo": "7H07AB1RAZ64978",
    "vendor": "Private",
    "protocolType": "Dahua2",
    "userName": "admin",
    "version": "2.800.0000000.3.R,2021-10-26",
    "connectionState": "Connected",
    "enabled": true,
    "videoInputChannels": 1,
    "audioInputChannels": 1,
    "alarmInChannels": 0
  }
}
```

**Error Response (Camera Not Found):**

```json
{
  "success": false,
  "error": "Camera not found for channel 10"
}
```

---

## RPC Methods

The REST API endpoints above use the following underlying RPC methods. You can also call these directly via the `/api/rpc` endpoint for more control.

### Get Camera State

Check the connection state of all camera channels.

**Method:** `LogicDeviceManager.getCameraState`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `uniqueChannels` | array | Array of channel numbers, or `[-1]` for all |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "LogicDeviceManager.getCameraState",
    "params": { "uniqueChannels": [-1] }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 3,
    "params": {
      "states": [
        { "channel": 0, "connectionState": "Connected" },
        { "channel": 1, "connectionState": "Connected" },
        { "channel": 2, "connectionState": "Connected" },
        { "channel": 3, "connectionState": "Connected" },
        { "channel": 4 },
        { "channel": 5 },
        { "channel": 6 },
        { "channel": 7 }
      ]
    },
    "result": true,
    "session": "YOUR_SESSION_ID"
  }
}
```

---

### Get Remote Device Configuration

Retrieve detailed configuration for all connected cameras.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"RemoteDevice"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "RemoteDevice" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 4,
    "params": {
      "table": {
        "uuid:System_CONFIG_NETCAMERA_INFO_0": {
          "Address": "192.168.1.221",
          "AlarmInChannels": 0,
          "AudioInputChannels": 1,
          "DeviceType": "IPC-F22-D",
          "Enable": true,
          "Encryption": 0,
          "HttpPort": 80,
          "HttpsPort": 443,
          "Mac": "ff:ff:ff:ff:ff:ff",
          "Name": "7H07AB1RAZ64978",
          "Password": "******",
          "Port": 37777,
          "ProtocolType": "Dahua2",
          "RtspPort": 554,
          "SerialNo": "7H07AB1RAZ64978",
          "UserName": "admin",
          "Vendor": "Private",
          "Version": "2.800.0000000.3.R,2021-10-26",
          "VideoInputChannels": 1,
          "VideoInputs": [
            {
              "ExtraStreamUrl": "",
              "MainStreamUrl": "",
              "Name": "",
              "ServiceType": "AUTO"
            }
          ]
        }
      }
    },
    "result": true,
    "session": "YOUR_SESSION_ID"
  }
}
```

---

### Get Channel Title

Get the display name for a channel.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"ChannelTitle"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "ChannelTitle" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "table": [
        { "Name": "Front Door" },
        { "Name": "Backyard" },
        { "Name": "Garage" }
      ]
    },
    "result": true
  }
}
```

---

## Video Encoding

### Get Encode Configuration

Retrieve video encoding settings for all channels.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Encode"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Encode" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "table": [
        {
          "MainFormat": [
            {
              "Video": {
                "Compression": "H.265",
                "Width": 2560,
                "Height": 1440,
                "FPS": 25,
                "BitRate": 4096,
                "BitRateControl": "VBR",
                "Quality": 4
              },
              "Audio": {
                "Compression": "AAC",
                "Enable": true
              }
            }
          ],
          "ExtraFormat": [
            {
              "Video": {
                "Compression": "H.265",
                "Width": 704,
                "Height": 576,
                "FPS": 15,
                "BitRate": 512
              }
            }
          ]
        }
      ]
    },
    "result": true
  }
}
```

### Encoding Parameters

| Parameter | Description | Common Values |
|-----------|-------------|---------------|
| `Compression` | Video codec | `H.264`, `H.265`, `MJPEG` |
| `Width` | Frame width | `1920`, `2560`, `3840` |
| `Height` | Frame height | `1080`, `1440`, `2160` |
| `FPS` | Frames per second | `1-30` |
| `BitRate` | Bitrate in kbps | `512-8192` |
| `BitRateControl` | Rate control | `CBR`, `VBR` |
| `Quality` | Quality level (VBR) | `1-6` |

---

## Snapshot

### Capture Snapshot

Capture a still image from a camera channel.

**Method:** `Encode.getSnapshot`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "Encode.getSnapshot",
    "params": { "channel": 0 }
  }'
```

### Direct Snapshot URL

You can also get snapshots directly from the device:

```
http://{device_ip}/cgi-bin/snapshot.cgi?channel={channel}
```

**Note:** Requires basic authentication or valid session cookie.

---

## Video Streams

### RTSP Streams

Dahua devices provide RTSP streams for live video:

**Main Stream:**
```
rtsp://{username}:{password}@{device_ip}:554/cam/realmonitor?channel={channel}&subtype=0
```

**Sub Stream:**
```
rtsp://{username}:{password}@{device_ip}:554/cam/realmonitor?channel={channel}&subtype=1
```

**Parameters:**
- `channel` - Channel number (1-based for RTSP)
- `subtype` - Stream type: `0` = Main, `1` = Sub

### Get RTSP URL

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"RTSP"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "RTSP" }
  }'
```

---

## Image Settings

### Get Color Configuration

Retrieve image color/brightness settings.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"VideoColor"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "VideoColor" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "table": [
        {
          "Brightness": 50,
          "Contrast": 50,
          "Saturation": 50,
          "Hue": 50,
          "Sharpness": 50
        }
      ]
    },
    "result": true
  }
}
```

### Set Color Configuration

**Method:** `configManager.setConfig`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.setConfig",
    "params": {
      "name": "VideoColor",
      "table": [
        {
          "Brightness": 60,
          "Contrast": 55,
          "Saturation": 50,
          "Hue": 50,
          "Sharpness": 50
        }
      ]
    }
  }'
```

---

## OSD (On-Screen Display)

### Get OSD Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"VideoWidget"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "VideoWidget" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "table": [
        {
          "ChannelTitle": {
            "Enable": true,
            "Name": "Camera 1",
            "Position": [0, 0]
          },
          "TimeTitle": {
            "Enable": true,
            "ShowWeek": true,
            "Position": [0, 576]
          }
        }
      ]
    },
    "result": true
  }
}
```

---

## Privacy Mask

### Get Privacy Mask Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"VideoMask"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "VideoMask" }
  }'
```

---

## Complete Example

Here's a complete example of getting camera information using the REST API:

```javascript
const API_URL = 'http://localhost:3000';

async function getCameraInfo() {
  // Step 1: Login
  const loginResponse = await fetch(`${API_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host: 'http://192.168.1.100',
      username: 'admin',
      password: 'your_password'
    })
  });
  const { session } = await loginResponse.json();

  // Step 2: Get all cameras using REST endpoint
  const camerasResponse = await fetch(
    `${API_URL}/api/cameras?session=${session}`
  );
  const { cameras, total } = await camerasResponse.json();

  console.log(`Found ${total} cameras:`);
  cameras.forEach(camera => {
    console.log(`  Channel ${camera.channel}: ${camera.deviceType} at ${camera.address}`);
    console.log(`    Status: ${camera.connectionState || 'Unknown'}`);
    console.log(`    Serial: ${camera.serialNo}`);
  });

  // Step 3: Get details for a specific camera
  const detailResponse = await fetch(
    `${API_URL}/api/cameras/0?session=${session}`
  );
  const { camera } = await detailResponse.json();

  console.log('\nCamera 0 Details:');
  console.log(`  Model: ${camera.deviceType}`);
  console.log(`  Address: ${camera.address}:${camera.port}`);
  console.log(`  RTSP Port: ${camera.rtspPort}`);
  console.log(`  Firmware: ${camera.version}`);

  // Step 4: Get channel titles (via RPC)
  const titlesResponse = await fetch(`${API_URL}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      method: 'configManager.getConfig',
      params: { name: 'ChannelTitle' }
    })
  });
  const titles = await titlesResponse.json();

  // Step 5: Get encoding settings (via RPC)
  const encodeResponse = await fetch(`${API_URL}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      method: 'configManager.getConfig',
      params: { name: 'Encode' }
    })
  });
  const encoding = await encodeResponse.json();

  // Step 6: Logout
  await fetch(`${API_URL}/api/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session })
  });

  return {
    cameras,
    titles: titles.data?.params?.table,
    encoding: encoding.data?.params?.table
  };
}

// Run the example
getCameraInfo().then(console.log).catch(console.error);
```

### Using cURL

```bash
# Login and save session
SESSION=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"host": "http://192.168.1.100", "username": "admin", "password": "your_password"}' \
  | jq -r '.session')

# List all cameras
curl -s "http://localhost:3000/api/cameras?session=$SESSION" | jq '.cameras[] | {channel, address, deviceType, connectionState}'

# Get specific camera details
curl -s "http://localhost:3000/api/cameras/0?session=$SESSION" | jq '.camera'

# Logout
curl -s -X POST http://localhost:3000/api/logout \
  -H "Content-Type: application/json" \
  -d "{\"session\": \"$SESSION\"}"
```
