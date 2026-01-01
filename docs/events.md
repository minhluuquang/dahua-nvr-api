# Events & Alarms

This document covers motion detection, alarm inputs/outputs, and event notifications.

## Overview

Dahua devices support various event types including motion detection, video loss, alarm inputs, and intelligent analytics. Events can trigger recordings, snapshots, email alerts, and alarm outputs.

---

## Motion Detection

### Get Motion Detection Configuration

Retrieve motion detection settings for a channel.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"MotionDetect"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "MotionDetect" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": [
      {
        "Enable": true,
        "Sensitivity": 3,
        "Region": [[1,1,1,1,0,0,0,0], [1,1,1,1,0,0,0,0]],
        "EventHandler": {
          "RecordEnable": true,
          "RecordChannels": [0],
          "SnapshotEnable": true,
          "SnapshotChannels": [0],
          "AlarmOutEnable": false,
          "AlarmOutChannels": [],
          "EmailEnable": true,
          "BeepEnable": true,
          "PresetEnable": false
        },
        "TimeSection": [
          { "StartHour": 0, "StartMin": 0, "EndHour": 24, "EndMin": 0 }
        ]
      }
    ]
  },
  "result": true
}
```

---

### Set Motion Detection

Update motion detection settings.

**Method:** `configManager.setConfig`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.setConfig",
    "params": {
      "name": "MotionDetect",
      "table": [
        {
          "Enable": true,
          "Sensitivity": 4,
          "EventHandler": {
            "RecordEnable": true,
            "EmailEnable": true
          }
        }
      ]
    }
  }'
```

**Sensitivity Levels:**

| Level | Description |
|-------|-------------|
| 1 | Lowest |
| 2 | Low |
| 3 | Medium |
| 4 | High |
| 5 | Higher |
| 6 | Highest |

---

## Video Loss Detection

### Get Video Loss Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"LossDetect"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "LossDetect" }
  }'
```

---

## Video Blind Detection

### Get Video Blind Configuration

Detect when camera is covered or obstructed.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"BlindDetect"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "BlindDetect" }
  }'
```

---

## Alarm Inputs

### Get Alarm Input Configuration

Retrieve alarm input settings.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Alarm"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Alarm" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": [
      {
        "Enable": true,
        "Name": "Door Sensor",
        "SensorType": "NC",
        "EventHandler": {
          "RecordEnable": true,
          "RecordChannels": [0, 1],
          "AlarmOutEnable": true,
          "AlarmOutChannels": [0],
          "EmailEnable": true
        }
      }
    ]
  },
  "result": true
}
```

**Sensor Types:**

| Type | Description |
|------|-------------|
| `NO` | Normally Open |
| `NC` | Normally Closed |

---

### Get Alarm Input Status

Check current state of alarm inputs.

**Method:** `Alarm.getInSlots`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "Alarm.getInSlots"
  }'
```

**Example Response:**

```json
{
  "params": {
    "slots": [
      { "index": 0, "state": "Normal", "name": "Door Sensor" },
      { "index": 1, "state": "Alarm", "name": "Window Sensor" }
    ]
  },
  "result": true
}
```

---

## Alarm Outputs

### Get Alarm Output Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"AlarmOut"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "AlarmOut" }
  }'
```

---

### Trigger Alarm Output

Manually trigger an alarm output.

**Method:** `Alarm.setOut`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `index` | number | Output index (0-based) |
| `action` | string | `"On"` or `"Off"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "Alarm.setOut",
    "params": {
      "index": 0,
      "action": "On"
    }
  }'
```

---

## Event Subscription

### Subscribe to Events

Subscribe to real-time event notifications.

**Method:** `eventManager.attach`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `codes` | array | Event codes to subscribe |

**Event Codes:**

| Code | Description |
|------|-------------|
| `VideoMotion` | Motion detection |
| `VideoLoss` | Video signal lost |
| `VideoBlind` | Camera obscured |
| `AlarmLocal` | Local alarm input |
| `StorageNotExist` | Storage missing |
| `StorageLowSpace` | Storage nearly full |
| `StorageFailure` | Storage error |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "eventManager.attach",
    "params": {
      "codes": ["VideoMotion", "AlarmLocal", "VideoLoss"]
    }
  }'
```

---

### Get Current Alarms

Retrieve list of active alarms.

**Method:** `eventManager.getEventIndexes`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Event code |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "eventManager.getEventIndexes",
    "params": {
      "code": "VideoMotion"
    }
  }'
```

---

## Intelligent Analytics

### Get IVS (Intelligent Video Surveillance) Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"VideoAnalyseRule"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "VideoAnalyseRule" }
  }'
```

**Common IVS Event Types:**

| Type | Description |
|------|-------------|
| `CrossLineDetection` | Line crossing |
| `CrossRegionDetection` | Area intrusion |
| `LeftDetection` | Object left behind |
| `TakenAwayDetection` | Object removed |
| `FaceDetection` | Face detection |
| `ParkingDetection` | Parking violation |

---

## Event Handlers

Event handlers define what actions to take when an event occurs.

### Handler Options

| Option | Description |
|--------|-------------|
| `RecordEnable` | Start recording |
| `RecordChannels` | Which channels to record |
| `SnapshotEnable` | Take snapshot |
| `SnapshotChannels` | Which channels to snapshot |
| `AlarmOutEnable` | Trigger alarm output |
| `AlarmOutChannels` | Which outputs to trigger |
| `EmailEnable` | Send email notification |
| `PTZEnable` | Trigger PTZ action |
| `PresetEnable` | Go to PTZ preset |
| `Preset` | Preset number |
| `BeepEnable` | Device beep |
| `LogEnable` | Log event |

**Example Event Handler:**

```json
{
  "EventHandler": {
    "RecordEnable": true,
    "RecordChannels": [0, 1],
    "SnapshotEnable": true,
    "SnapshotChannels": [0],
    "AlarmOutEnable": true,
    "AlarmOutChannels": [0],
    "EmailEnable": true,
    "PTZEnable": true,
    "PresetEnable": true,
    "Preset": 1,
    "BeepEnable": true,
    "LogEnable": true,
    "Delay": 10,
    "RecordLatch": 30
  }
}
```

---

## Abnormal Events

### Get Storage Abnormal Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"StorageNotExist"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "StorageNotExist" }
  }'
```

**Other Abnormal Events:**

- `StorageLowSpace` - Low disk space
- `StorageFailure` - Disk error
- `NetAbort` - Network disconnected
- `IPConflict` - IP address conflict

---

## Event Log Search

### Search Events

Search historical event logs.

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
        "EndTime": "2024-01-31 23:59:59",
        "Types": ["Alarm", "VideoMotion"],
        "Order": "Descent"
      }
    }
  }'
```

---

## Complete Example

Here's a complete example for monitoring events:

```javascript
class EventMonitor {
  constructor(apiUrl, session) {
    this.apiUrl = apiUrl;
    this.session = session;
    this.attached = false;
  }

  async getMotionConfig(channel) {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'configManager.getConfig',
        params: { name: 'MotionDetect' }
      })
    });
    const data = await response.json();
    return data.data?.params?.table?.[channel];
  }

  async setMotionSensitivity(channel, sensitivity) {
    const config = await this.getMotionConfig(channel);
    config.Sensitivity = sensitivity;
    
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'configManager.setConfig',
        params: {
          name: 'MotionDetect',
          table: [config]
        }
      })
    });
    return response.json();
  }

  async getAlarmInputStatus() {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'Alarm.getInSlots'
      })
    });
    return response.json();
  }

  async triggerAlarmOutput(index, on = true) {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'Alarm.setOut',
        params: {
          index,
          action: on ? 'On' : 'Off'
        }
      })
    });
    return response.json();
  }

  async searchEvents(startTime, endTime, types = ['All']) {
    // Start search
    const startRes = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'log.startFind',
        params: {
          condition: {
            StartTime: startTime,
            EndTime: endTime,
            Types: types
          }
        }
      })
    });
    const { data: startData } = await startRes.json();
    const token = startData?.params?.token;

    if (!token) {
      return [];
    }

    // Get results
    const events = [];
    let hasMore = true;

    while (hasMore) {
      const nextRes = await fetch(`${this.apiUrl}/api/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: this.session,
          method: 'log.doFind',
          params: {
            token,
            count: 100
          }
        })
      });
      
      const { data } = await nextRes.json();
      
      if (data?.params?.found > 0) {
        events.push(...data.params.items);
      }
      
      hasMore = data?.params?.found === 100;
    }

    // Stop search
    await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'log.stopFind',
        params: { token }
      })
    });

    return events;
  }
}

// Usage
const monitor = new EventMonitor('http://localhost:3000', session);

// Get motion detection config for channel 0
const motionConfig = await monitor.getMotionConfig(0);
console.log('Motion enabled:', motionConfig.Enable);
console.log('Sensitivity:', motionConfig.Sensitivity);

// Set higher sensitivity
await monitor.setMotionSensitivity(0, 5);

// Check alarm inputs
const alarmStatus = await monitor.getAlarmInputStatus();
console.log('Alarm inputs:', alarmStatus.data.params.slots);

// Trigger alarm output
await monitor.triggerAlarmOutput(0, true);
await new Promise(r => setTimeout(r, 5000));
await monitor.triggerAlarmOutput(0, false);

// Search motion events from last 24 hours
const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0, 19).replace('T', ' ');
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
const events = await monitor.searchEvents(yesterday, now, ['VideoMotion']);
console.log(`Found ${events.length} motion events`);
```
