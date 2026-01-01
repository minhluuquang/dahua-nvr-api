# PTZ Control

This document covers Pan-Tilt-Zoom operations for PTZ-capable cameras.

## Overview

PTZ (Pan-Tilt-Zoom) control allows you to remotely move and zoom cameras. Dahua supports both analog PTZ via coax and IP PTZ cameras.

---

## PTZ Movement

### Start PTZ Movement

Begin continuous PTZ movement in a direction.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | Direction code (see below) |
| `arg1` | number | Horizontal speed (0-8) |
| `arg2` | number | Vertical speed (0-8) |
| `arg3` | number | Zoom speed (0-8) |

**Direction Codes:**

| Code | Description |
|------|-------------|
| `Up` | Tilt up |
| `Down` | Tilt down |
| `Left` | Pan left |
| `Right` | Pan right |
| `LeftUp` | Pan left + Tilt up |
| `LeftDown` | Pan left + Tilt down |
| `RightUp` | Pan right + Tilt up |
| `RightDown` | Pan right + Tilt down |
| `ZoomIn` | Zoom in (telephoto) |
| `ZoomOut` | Zoom out (wide) |
| `FocusNear` | Focus near |
| `FocusFar` | Focus far |
| `IrisOpen` | Open iris |
| `IrisClose` | Close iris |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "Right",
      "arg1": 5,
      "arg2": 0,
      "arg3": 0
    }
  }'
```

---

### Stop PTZ Movement

Stop current PTZ movement.

**Method:** `ptz.stop`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | Direction code to stop |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.stop",
    "params": {
      "channel": 0,
      "code": "Right"
    }
  }'
```

---

### Get Current Position

Retrieve the current PTZ position.

**Method:** `ptz.getStatus`

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
    "method": "ptz.getStatus",
    "params": {
      "channel": 0
    }
  }'
```

**Example Response:**

```json
{
  "params": {
    "status": {
      "Position": [180.0, 0.0, 1.0],
      "Action": "Idle",
      "MoveStatus": "Idle",
      "Presets": [1, 2, 3, 5]
    }
  },
  "result": true
}
```

**Position Array:**
- `[0]` - Pan position (0-360 degrees)
- `[1]` - Tilt position (-90 to 90 degrees)
- `[2]` - Zoom level (1.0 = 1x)

---

### Set Absolute Position

Move to a specific position.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"PositionABS"` |
| `arg1` | number | Pan position (0-3600, x10 degrees) |
| `arg2` | number | Tilt position (-900 to 900) |
| `arg3` | number | Zoom position |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "PositionABS",
      "arg1": 1800,
      "arg2": 0,
      "arg3": 100
    }
  }'
```

---

## Presets

### Get All Presets

Retrieve list of configured presets.

**Method:** `ptz.getPresets`

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
    "method": "ptz.getPresets",
    "params": {
      "channel": 0
    }
  }'
```

**Example Response:**

```json
{
  "params": {
    "presets": [
      { "Index": 1, "Name": "Front Door" },
      { "Index": 2, "Name": "Parking Lot" },
      { "Index": 3, "Name": "Side Entrance" }
    ]
  },
  "result": true
}
```

---

### Go to Preset

Move camera to a preset position.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"GotoPreset"` |
| `arg1` | number | Speed (0-8) |
| `arg2` | number | Preset index (1-based) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "GotoPreset",
      "arg1": 5,
      "arg2": 1
    }
  }'
```

---

### Set Preset

Save current position as a preset.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"SetPreset"` |
| `arg2` | number | Preset index (1-based) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "SetPreset",
      "arg2": 10
    }
  }'
```

---

### Delete Preset

Remove a preset.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"RemovePreset"` |
| `arg2` | number | Preset index (1-based) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "RemovePreset",
      "arg2": 10
    }
  }'
```

---

## Tours

### Start Tour

Begin an automated preset tour.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"StartTour"` |
| `arg2` | number | Tour index (1-based) |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "StartTour",
      "arg2": 1
    }
  }'
```

---

### Stop Tour

Stop the current tour.

**Method:** `ptz.stop`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"StopTour"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.stop",
    "params": {
      "channel": 0,
      "code": "StopTour"
    }
  }'
```

---

## Auto Scan

### Start Auto Scan

Begin horizontal auto-scanning.

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"AutoScanOn"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "ptz.start",
    "params": {
      "channel": 0,
      "code": "AutoScanOn"
    }
  }'
```

---

### Stop Auto Scan

**Method:** `ptz.start`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `code` | string | `"AutoScanOff"` |

---

## PTZ Configuration

### Get PTZ Protocol

Retrieve the configured PTZ protocol.

**Method:** `ptz.getCurrentProtocolCaps`

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
    "method": "ptz.getCurrentProtocolCaps",
    "params": {
      "channel": 0
    }
  }'
```

---

### Get PTZ Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Ptz"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Ptz" }
  }'
```

---

## Complete Example

Here's a complete example for PTZ control:

```javascript
class PTZController {
  constructor(apiUrl, session, channel) {
    this.apiUrl = apiUrl;
    this.session = session;
    this.channel = channel;
  }

  async sendCommand(code, arg1 = 0, arg2 = 0, arg3 = 0) {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'ptz.start',
        params: {
          channel: this.channel,
          code,
          arg1,
          arg2,
          arg3
        }
      })
    });
    return response.json();
  }

  async stop(code = 'Up') {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'ptz.stop',
        params: {
          channel: this.channel,
          code
        }
      })
    });
    return response.json();
  }

  // Movement commands
  async panLeft(speed = 5) { return this.sendCommand('Left', speed); }
  async panRight(speed = 5) { return this.sendCommand('Right', speed); }
  async tiltUp(speed = 5) { return this.sendCommand('Up', 0, speed); }
  async tiltDown(speed = 5) { return this.sendCommand('Down', 0, speed); }
  async zoomIn(speed = 5) { return this.sendCommand('ZoomIn', 0, 0, speed); }
  async zoomOut(speed = 5) { return this.sendCommand('ZoomOut', 0, 0, speed); }

  // Preset commands
  async goToPreset(presetIndex, speed = 5) {
    return this.sendCommand('GotoPreset', speed, presetIndex);
  }

  async setPreset(presetIndex) {
    return this.sendCommand('SetPreset', 0, presetIndex);
  }

  async deletePreset(presetIndex) {
    return this.sendCommand('RemovePreset', 0, presetIndex);
  }

  // Get status
  async getStatus() {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'ptz.getStatus',
        params: { channel: this.channel }
      })
    });
    return response.json();
  }

  // Get presets
  async getPresets() {
    const response = await fetch(`${this.apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: this.session,
        method: 'ptz.getPresets',
        params: { channel: this.channel }
      })
    });
    return response.json();
  }
}

// Usage
const ptz = new PTZController('http://localhost:3000', session, 0);

// Pan right for 2 seconds
await ptz.panRight(5);
await new Promise(r => setTimeout(r, 2000));
await ptz.stop('Right');

// Go to preset 1
await ptz.goToPreset(1);

// Get current position
const status = await ptz.getStatus();
console.log('Position:', status.data.params.status.Position);
```
