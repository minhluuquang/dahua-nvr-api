# Dahua NVR/Camera API Documentation

A REST API wrapper for Dahua NVR and IP Camera devices, built with Hono.js.

## Overview

This API provides a simplified interface to interact with Dahua surveillance devices through their RPC protocol. It handles the complex challenge-response authentication and exposes a clean REST API.

## Table of Contents

- [Authentication](./auth.md) - Login, logout, and session management
- [System](./system.md) - Device information and system configuration
- [Camera](./camera.md) - Camera channels and video settings
- [Storage](./storage.md) - HDD, recording, and playback
- [Network](./network.md) - Network configuration
- [PTZ](./ptz.md) - Pan-Tilt-Zoom control
- [Events](./events.md) - Alarms, motion detection, and notifications

## Quick Start

### Installation

```bash
bun install
```

### Running the Server

```bash
# Development
bun run dev

# Production
bun run build
bun run start
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/swagger` | GET | Swagger UI |
| `/doc` | GET | OpenAPI JSON spec |
| `/api/login` | POST | Login to device |
| `/api/logout` | POST | Logout from device |
| `/api/keepalive` | POST | Keep session alive |
| `/api/cameras` | GET | List all cameras |
| `/api/cameras/{channel}` | GET | Get camera details |
| `/api/rpc` | POST | Send RPC command |

### Basic Usage

1. **Login to get a session:**

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "host": "http://192.168.1.100",
    "username": "admin",
    "password": "your_password"
  }'
```

Response:
```json
{
  "success": true,
  "session": "abc123def456",
  "keepAliveInterval": 60,
  "message": "Login successful"
}
```

2. **Get list of cameras:**

```bash
curl "http://localhost:3000/api/cameras?session=abc123def456"
```

Response:
```json
{
  "success": true,
  "cameras": [
    {
      "channel": 0,
      "address": "192.168.1.221",
      "deviceType": "IPC-C22E-D",
      "connectionState": "Connected",
      "enabled": true
    }
  ],
  "total": 1
}
```

3. **Get specific camera details:**

```bash
curl "http://localhost:3000/api/cameras/0?session=abc123def456"
```

4. **Make RPC calls using the session:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "abc123def456",
    "method": "magicBox.getDeviceType"
  }'
```

5. **Logout when done:**

```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Content-Type: application/json" \
  -d '{"session": "abc123def456"}'
```

## Architecture

### Request Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Client    │────▶│  Hono API   │────▶│  Dahua Device   │
│  (REST)     │◀────│  Server     │◀────│  (RPC2)         │
└─────────────┘     └─────────────┘     └─────────────────┘
```

### Code Structure
```
src/
├── index.ts              # Server bootstrap
├── app.ts                # Hono app + middleware
├── openapi.ts            # OpenAPI config + Swagger UI
├── dahua-client.ts       # Dahua RPC client
├── schemas/              # Zod + OpenAPI schemas
│   ├── index.ts          # Barrel export
│   ├── common.ts         # Shared schemas
│   ├── auth.ts           # Authentication schemas
│   ├── camera.ts         # Camera schemas
│   └── rpc.ts            # RPC schemas
├── routes/               # Route definitions + handlers
│   ├── index.ts          # Route registration
│   ├── health.ts         # Health check
│   ├── auth.ts           # Login/logout/keepalive
│   ├── cameras.ts        # Camera management
│   └── rpc.ts            # Generic RPC calls
└── services/             # Business logic
    ├── session.ts        # Session management
    └── camera.ts         # Camera data parsing
```

**Design Principles:**
- **Feature-based organization** - Routes, schemas, and handlers grouped by domain
- **Single Responsibility** - Each module has one clear purpose
- **Type Safety** - Zod schemas provide runtime validation + TypeScript types
- **Scalability** - Easy to add new domains (storage, events, PTZ)

## Supported Devices

This API has been tested with:
- Dahua NVR (DHI-NVR1108HS-S3/H)
- Dahua IP Cameras

Most Dahua devices with web interface support should work.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `401` - Authentication failed
- `404` - Session not found
- `500` - Internal server error

## Session Management

- Sessions expire after a period of inactivity (typically 60 seconds)
- Use `/api/keepalive` to prevent session timeout
- The `keepAliveInterval` from login response indicates how often to call keepalive
- Always call `/api/logout` when done to free device resources

## Security Considerations

- This API stores sessions in memory (use Redis for production)
- Passwords are never stored; only session IDs are kept
- Use HTTPS in production to protect credentials in transit
- Consider implementing rate limiting for production use

## License

MIT
