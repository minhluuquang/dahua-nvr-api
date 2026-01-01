# System Information

This document covers device information, system configuration, and maintenance operations.

## Overview

System operations allow you to retrieve device information, manage settings, update firmware, and perform maintenance tasks like rebooting.

---

## Device Information

### Get Device Type

Retrieve the device model/type.

**Method:** `magicBox.getDeviceType`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getDeviceType"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "params": {
      "type": "DHI-NVR1108HS-S3/H"
    },
    "result": true
  }
}
```

---

### Get Serial Number

Retrieve the device serial number.

**Method:** `magicBox.getSerialNo`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getSerialNo"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "sn": "7C0DE51PAZ15136"
    },
    "result": true
  }
}
```

---

### Get Software Version

Retrieve firmware/software version information.

**Method:** `magicBox.getSoftwareVersion`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getSoftwareVersion"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "version": {
        "Build": "2023-06-15",
        "Major": 4,
        "Minor": 1,
        "OemVersion": "General",
        "Revision": 0,
        "SecurityBaseLineVersion": "V3.1"
      }
    },
    "result": true
  }
}
```

---

### Get Hardware Version

Retrieve hardware version information.

**Method:** `magicBox.getHardwareVersion`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getHardwareVersion"
  }'
```

---

### Get Device Class

Get the device classification.

**Method:** `magicBox.getDeviceClass`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getDeviceClass"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "type": "NVR"
    },
    "result": true
  }
}
```

---

### Get Machine Name

Retrieve the configured device name.

**Method:** `magicBox.getMachineName`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getMachineName"
  }'
```

---

### Get Vendor Information

Retrieve manufacturer/vendor information.

**Method:** `magicBox.getVendor`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getVendor"
  }'
```

---

## System Time

### Get Current Time

Retrieve the current device time.

**Method:** `global.getCurrentTime`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "global.getCurrentTime"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "time": "2024-01-15 14:30:45"
    },
    "result": true
  }
}
```

---

### Get Time Configuration

Retrieve NTP and timezone settings.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"NTP"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "NTP" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "table": {
        "Enable": true,
        "Server": "pool.ntp.org",
        "Port": 123,
        "UpdatePeriod": 60,
        "TimeZone": 7
      }
    },
    "result": true
  }
}
```

---

### Get Locales

Retrieve date/time format settings.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Locales"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Locales" }
  }'
```

---

## System Status

### Get CPU Usage

Retrieve current CPU usage.

**Method:** `PerformanceManager.getCPUUsage`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "PerformanceManager.getCPUUsage"
  }'
```

---

### Get Memory Info

Retrieve memory usage information.

**Method:** `PerformanceManager.getMemoryInfo`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "PerformanceManager.getMemoryInfo"
  }'
```

---

## User Management

### Get Active Users

Retrieve list of currently logged-in users.

**Method:** `UserManager.getActiveUserInfoAll`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "UserManager.getActiveUserInfoAll"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "users": [
        {
          "Name": "admin",
          "ClientType": "Web3.0",
          "LoginTime": "2024-01-15 14:30:00",
          "ClientAddress": "192.168.1.100"
        }
      ]
    },
    "result": true
  }
}
```

---

### Get User List

Retrieve all configured users.

**Method:** `userManager.getUserInfoAll`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "userManager.getUserInfoAll"
  }'
```

---

## System Capabilities

### Get System Capabilities

Retrieve device capabilities and feature support.

**Method:** `magicBox.getProductDefinition`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getProductDefinition"
  }'
```

---

### Get Maximum Channels

Get the maximum number of supported channels.

**Method:** `magicBox.getMaxChannelNum`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.getMaxChannelNum"
  }'
```

---

## Maintenance

### Reboot Device

Restart the device.

**Method:** `magicBox.reboot`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.reboot"
  }'
```

**Warning:** This will disconnect all sessions and the device will be unavailable for 1-2 minutes.

---

### Shutdown Device

Power off the device.

**Method:** `magicBox.shutdown`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "magicBox.shutdown"
  }'
```

---

### Factory Reset

Reset device to factory defaults.

**Method:** `configManager.setDefault`

**Warning:** This will erase all configuration!

---

## System Logs

### Get System Logs

Search and retrieve system logs.

**Method:** `log.startFind`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `condition` | object | Search criteria |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "log.startFind",
    "params": {
      "condition": {
        "StartTime": "2024-01-01 00:00:00",
        "EndTime": "2024-01-15 23:59:59",
        "Types": ["All"]
      }
    }
  }'
```

---

## Complete Example

Here's a complete example to get all system information:

```javascript
async function getSystemInfo(apiUrl, session) {
  const methods = [
    'magicBox.getDeviceType',
    'magicBox.getSerialNo',
    'magicBox.getSoftwareVersion',
    'magicBox.getHardwareVersion',
    'magicBox.getMachineName',
    'magicBox.getDeviceClass',
    'global.getCurrentTime'
  ];

  const results = {};

  for (const method of methods) {
    const response = await fetch(`${apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, method })
    });
    
    const data = await response.json();
    const key = method.split('.')[1];
    results[key] = data.data?.params;
  }

  return results;
}

// Usage
const systemInfo = await getSystemInfo('http://localhost:3000', session);
console.log(systemInfo);
/*
{
  getDeviceType: { type: 'DHI-NVR1108HS-S3/H' },
  getSerialNo: { sn: '7C0DE51PAZ15136' },
  getSoftwareVersion: { version: { Major: 4, Minor: 1, ... } },
  ...
}
*/
```
