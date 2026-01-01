# Authentication

This document describes the authentication system for connecting to Dahua NVR/Camera devices.

## Overview

Dahua devices use a challenge-response authentication protocol similar to HTTP Digest Authentication. This API handles the complexity internally and exposes simple REST endpoints.

## Authentication Flow

```
┌────────┐                    ┌────────┐                    ┌────────┐
│ Client │                    │  API   │                    │ Device │
└───┬────┘                    └───┬────┘                    └───┬────┘
    │                             │                             │
    │ POST /api/login             │                             │
    │ {host, username, password}  │                             │
    │────────────────────────────▶│                             │
    │                             │                             │
    │                             │ Phase 1: Request Challenge  │
    │                             │ {username, password: ""}    │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │ Challenge Response          │
    │                             │ {realm, random, session}    │
    │                             │◀────────────────────────────│
    │                             │                             │
    │                             │ Phase 2: Authenticate       │
    │                             │ {username, hashedPassword}  │
    │                             │────────────────────────────▶│
    │                             │                             │
    │                             │ Success + Session           │
    │                             │◀────────────────────────────│
    │                             │                             │
    │ {success, session}          │                             │
    │◀────────────────────────────│                             │
    │                             │                             │
```

## Password Hashing Algorithm

The password is hashed using a double MD5 digest:

```
HA1 = MD5(username:realm:password)
FinalHash = MD5(username:random:HA1).toUpperCase()
```

### Example

```javascript
const crypto = require('crypto');

function hashPassword(username, password, realm, random) {
  const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');
  
  // Step 1: HA1 = MD5(username:realm:password)
  const ha1 = md5(`${username}:${realm}:${password}`);
  
  // Step 2: Final = MD5(username:random:HA1)
  const final = md5(`${username}:${random}:${ha1}`);
  
  return final.toUpperCase();
}
```

---

## API Endpoints

### POST /api/login

Authenticate with a Dahua device.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `host` | string | Yes | Device URL (e.g., `http://192.168.1.100`) |
| `username` | string | Yes | Username (usually `admin`) |
| `password` | string | Yes | Password |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "host": "http://192.168.1.100",
    "username": "admin",
    "password": "your_password"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "session": "8acf34e536c1c0ddf702581819a7fa1c",
  "keepAliveInterval": 60,
  "message": "Login successful"
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": "Authentication failed: Component error: password not valid!"
}
```

**Error Response (400):**

```json
{
  "success": false,
  "error": "Missing required fields: host, username, password"
}
```

---

### POST /api/logout

End a session with the device.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session` | string | Yes | Session ID from login |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/logout \
  -H "Content-Type: application/json" \
  -d '{
    "session": "8acf34e536c1c0ddf702581819a7fa1c"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Response (404):**

```json
{
  "success": false,
  "error": "Session not found"
}
```

---

### POST /api/keepalive

Keep a session alive to prevent timeout.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session` | string | Yes | Session ID from login |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/keepalive \
  -H "Content-Type: application/json" \
  -d '{
    "session": "8acf34e536c1c0ddf702581819a7fa1c"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Session kept alive"
}
```

---

## Session Management Best Practices

### 1. Store the Session ID

After login, store the session ID for subsequent requests:

```javascript
const response = await fetch('http://localhost:3000/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    host: 'http://192.168.1.100',
    username: 'admin',
    password: 'password'
  })
});

const { session, keepAliveInterval } = await response.json();
```

### 2. Implement Keep-Alive

Set up a periodic keep-alive to prevent session timeout:

```javascript
const keepAliveTimer = setInterval(async () => {
  await fetch('http://localhost:3000/api/keepalive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session })
  });
}, (keepAliveInterval - 5) * 1000); // 5 seconds before timeout
```

### 3. Clean Up on Exit

Always logout when done:

```javascript
process.on('SIGINT', async () => {
  clearInterval(keepAliveTimer);
  await fetch('http://localhost:3000/api/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session })
  });
  process.exit();
});
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `268632079` | Login challenge (expected during auth) |
| `268632070` | User not exist |
| `268632071` | Password incorrect |
| `268632073` | User locked |
| `268632081` | Account locked |
| `268632085` | Password failed |

---

## Security Notes

1. **Never store passwords** - Only session IDs should be stored
2. **Use HTTPS** - Protect credentials in transit in production
3. **Session expiry** - Sessions typically expire after 60 seconds of inactivity
4. **Limited connections** - Dahua devices have a limit on concurrent sessions
5. **Logout properly** - Always logout to free device resources

---

## Direct RPC Authentication

If you need to authenticate directly with the device (bypassing this API), here are the raw RPC calls:

### Phase 1: Request Challenge

```http
POST /RPC2_Login HTTP/1.1
Content-Type: application/json

{
  "method": "global.login",
  "params": {
    "userName": "admin",
    "password": "",
    "clientType": "Web3.0"
  },
  "id": 1
}
```

### Phase 2: Authenticate

```http
POST /RPC2_Login HTTP/1.1
Content-Type: application/json

{
  "method": "global.login",
  "params": {
    "userName": "admin",
    "password": "HASHED_PASSWORD_HERE",
    "clientType": "Web3.0",
    "authorityType": "Default",
    "passwordType": "Default"
  },
  "id": 2,
  "session": "SESSION_FROM_PHASE_1"
}
```
