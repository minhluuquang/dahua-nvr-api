# Storage & Recording

This document covers HDD management, recording configuration, and video playback/search.

## Overview

Dahua NVR/Camera devices support local storage (HDD/SSD) and network storage (NAS). Recordings can be scheduled, triggered by events, or manually controlled.

---

## Storage Management

### Get Storage Device Info

Retrieve information about connected storage devices.

**Method:** `storage.getDeviceAllInfo`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "storage.getDeviceAllInfo"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "info": [
        {
          "Name": "/dev/sda",
          "State": "Normal",
          "TotalBytes": 1000204886016,
          "UsedBytes": 524288000000,
          "Type": "SATA",
          "Health": "Good"
        }
      ]
    },
    "result": true
  }
}
```

---

### Get HDD Information

Get detailed HDD status and health information.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"StorageGlobal"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "StorageGlobal" }
  }'
```

---

### Get Storage Group

Retrieve storage group configuration (which channels record to which HDD).

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"StorageGroup"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "StorageGroup" }
  }'
```

---

## Recording Configuration

### Get Record Mode

Retrieve recording mode configuration.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"RecordMode"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "RecordMode" }
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
          "Mode": 1,
          "MainStream": 0,
          "SubStream": 1
        }
      ]
    },
    "result": true
  }
}
```

**Recording Modes:**

| Mode | Description |
|------|-------------|
| `0` | Auto (scheduled) |
| `1` | Manual |
| `2` | Off |

---

### Get Record Schedule

Retrieve the recording schedule configuration.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Record"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Record" }
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
          "TimeSection": [
            [
              { "StartHour": 0, "StartMin": 0, "EndHour": 24, "EndMin": 0, "RecordType": "Regular" }
            ],
            [
              { "StartHour": 0, "StartMin": 0, "EndHour": 24, "EndMin": 0, "RecordType": "Regular" }
            ]
          ],
          "PreRecord": 5,
          "Redundancy": false
        }
      ]
    },
    "result": true
  }
}
```

**Record Types:**

| Type | Description |
|------|-------------|
| `Regular` | Continuous recording |
| `MD` | Motion detection |
| `Alarm` | Alarm-triggered |
| `MD&Alarm` | Motion + Alarm |
| `Intelligence` | AI/Analytics triggered |

---

### Manual Recording Control

Start or stop manual recording on a channel.

**Method:** `recConfig.setRecordMode`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `channel` | number | Channel index (0-based) |
| `mode` | number | `0`=Auto, `1`=Manual On, `2`=Off |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "recConfig.setRecordMode",
    "params": {
      "channel": 0,
      "mode": 1
    }
  }'
```

---

## Video Search

### Search Recordings

Search for recorded video files.

**Method:** `mediaFileFind.factory.create` → `mediaFileFind.findFile` → `mediaFileFind.findNextFile`

**Step 1: Create finder object**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "mediaFileFind.factory.create"
  }'
```

**Response:**

```json
{
  "params": {
    "id": 12345
  },
  "result": true
}
```

**Step 2: Start search**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "mediaFileFind.findFile",
    "params": {
      "object": 12345,
      "condition": {
        "Channel": 0,
        "StartTime": "2024-01-01 00:00:00",
        "EndTime": "2024-01-15 23:59:59",
        "Types": ["dav"],
        "Flags": ["Event", "Timing"]
      }
    }
  }'
```

**Step 3: Get results**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "mediaFileFind.findNextFile",
    "params": {
      "object": 12345,
      "count": 100
    }
  }'
```

**Example Response:**

```json
{
  "params": {
    "found": 25,
    "infos": [
      {
        "Channel": 0,
        "StartTime": "2024-01-15 10:00:00",
        "EndTime": "2024-01-15 10:30:00",
        "Length": 1048576000,
        "Type": "dav",
        "FilePath": "/mnt/dvr/2024-01-15/001/10.00.00-10.30.00.dav",
        "Flags": ["Timing"]
      }
    ]
  },
  "result": true
}
```

**Step 4: Close finder**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "mediaFileFind.close",
    "params": {
      "object": 12345
    }
  }'
```

---

### Search by Date

Get a calendar view of recording availability.

**Method:** `RecordFinder.factory.create` → `RecordFinder.getRecordDays`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "RecordFinder.getRecordDays",
    "params": {
      "object": 12345,
      "channel": 0,
      "year": 2024,
      "month": 1
    }
  }'
```

**Example Response:**

```json
{
  "params": {
    "days": [1, 2, 3, 5, 8, 10, 15, 20, 25, 30]
  },
  "result": true
}
```

---

## Playback

### Download Recording

Download a recorded video file.

**HTTP Request:**

```
GET /RPC_Loadfile/{filepath}?session={session_id}
```

**Example:**

```bash
curl -o recording.dav \
  "http://192.168.1.100/RPC_Loadfile/mnt/dvr/2024-01-15/001/10.00.00-10.30.00.dav?session=YOUR_SESSION_ID"
```

---

### Export to MP4

Export recording to MP4 format.

**Method:** `mediaFileFind.exportFile`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `srcFile` | string | Source file path |
| `dstFile` | string | Destination file path |
| `type` | string | `"mp4"` |

---

## Storage Settings

### Get Overwrite Policy

Check what happens when storage is full.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"StorageGlobal"` |

**Example Response Fields:**

| Field | Description |
|-------|-------------|
| `Overwrite` | Auto-overwrite old recordings |
| `PacketLength` | Recording segment length (minutes) |
| `PreRecord` | Pre-event recording time (seconds) |

---

### Set Storage Configuration

**Method:** `configManager.setConfig`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.setConfig",
    "params": {
      "name": "StorageGlobal",
      "table": {
        "Overwrite": true,
        "PacketLength": 30
      }
    }
  }'
```

---

## NAS Storage

### Get NAS Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"NAS"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "NAS" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": {
      "Enable": true,
      "Address": "192.168.1.200",
      "Directory": "/recordings",
      "Protocol": "NFS",
      "Username": "",
      "Password": ""
    }
  },
  "result": true
}
```

---

## Complete Example

Here's a complete example to search and list recordings:

```javascript
async function searchRecordings(apiUrl, session, channel, startDate, endDate) {
  // Create finder
  const createRes = await fetch(`${apiUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      method: 'mediaFileFind.factory.create'
    })
  });
  const { data: createData } = await createRes.json();
  const finderId = createData.params.id;

  // Start search
  await fetch(`${apiUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      method: 'mediaFileFind.findFile',
      params: {
        object: finderId,
        condition: {
          Channel: channel,
          StartTime: startDate,
          EndTime: endDate,
          Types: ['dav'],
          Flags: ['Event', 'Timing']
        }
      }
    })
  });

  // Get all results
  const allResults = [];
  let hasMore = true;

  while (hasMore) {
    const nextRes = await fetch(`${apiUrl}/api/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session,
        method: 'mediaFileFind.findNextFile',
        params: {
          object: finderId,
          count: 100
        }
      })
    });
    
    const { data } = await nextRes.json();
    
    if (data.params.found > 0) {
      allResults.push(...data.params.infos);
    }
    
    hasMore = data.params.found === 100;
  }

  // Close finder
  await fetch(`${apiUrl}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session,
      method: 'mediaFileFind.close',
      params: { object: finderId }
    })
  });

  return allResults;
}

// Usage
const recordings = await searchRecordings(
  'http://localhost:3000',
  session,
  0,
  '2024-01-01 00:00:00',
  '2024-01-31 23:59:59'
);

console.log(`Found ${recordings.length} recordings`);
```
