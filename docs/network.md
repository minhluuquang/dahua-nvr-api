# Network Configuration

This document covers network settings, ports, and connectivity options for Dahua devices.

## Overview

Dahua NVR/Camera devices support various network configurations including static IP, DHCP, multiple network interfaces, and port forwarding.

---

## Network Interface

### Get Network Configuration

Retrieve network interface settings.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Network"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Network" }
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "params": {
      "table": {
        "eth0": {
          "IPAddress": "192.168.1.100",
          "SubnetMask": "255.255.255.0",
          "DefaultGateway": "192.168.1.1",
          "DhcpEnable": false,
          "PhysicalAddress": "00:11:22:33:44:55",
          "MTU": 1500
        },
        "DNS": {
          "Preferred": "8.8.8.8",
          "Alternate": "8.8.4.4"
        }
      }
    },
    "result": true
  }
}
```

---

### Set Network Configuration

Update network interface settings.

**Method:** `configManager.setConfig`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.setConfig",
    "params": {
      "name": "Network",
      "table": {
        "eth0": {
          "IPAddress": "192.168.1.101",
          "SubnetMask": "255.255.255.0",
          "DefaultGateway": "192.168.1.1",
          "DhcpEnable": false
        }
      }
    }
  }'
```

**Warning:** Changing the IP address will disconnect your session!

---

## Port Configuration

### Get TCP Port Settings

Retrieve service port configuration.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"TCPPort"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "TCPPort" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": {
      "TCPPort": 37777,
      "UDPPort": 37778,
      "MaxConnectNum": 10
    }
  },
  "result": true
}
```

---

### Get HTTP Port

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"HTTP"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "HTTP" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": {
      "Enable": true,
      "Port": 80
    }
  },
  "result": true
}
```

---

### Get HTTPS Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"HTTPS"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "HTTPS" }
  }'
```

---

### Common Ports

| Service | Default Port | Description |
|---------|--------------|-------------|
| HTTP | 80 | Web interface |
| HTTPS | 443 | Secure web interface |
| RTSP | 554 | Video streaming |
| TCP | 37777 | Client connections |
| UDP | 37778 | Client connections |

---

## RTSP Configuration

### Get RTSP Settings

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

**Example Response:**

```json
{
  "params": {
    "table": {
      "Enable": true,
      "Port": 554,
      "RTP_StartPort": 40000,
      "RTP_EndPort": 50000,
      "AuthenticationMode": "digest"
    }
  },
  "result": true
}
```

---

## ONVIF

### Get ONVIF Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"ONVIF"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "ONVIF" }
  }'
```

---

## Email Configuration

### Get Email/SMTP Settings

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"Email"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "Email" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": {
      "Enable": true,
      "Server": "smtp.gmail.com",
      "Port": 587,
      "Encryption": "STARTTLS",
      "Username": "user@gmail.com",
      "SendAddress": "user@gmail.com",
      "ReceiverAddresses": ["alert@example.com"],
      "Interval": 120,
      "AttachSnapshot": true
    }
  },
  "result": true
}
```

---

### Test Email

Send a test email.

**Method:** `configManager.testEmail`

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.testEmail"
  }'
```

---

## FTP Configuration

### Get FTP Settings

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"FTP"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "FTP" }
  }'
```

---

## P2P / Cloud

### Get P2P Status

Check P2P cloud connectivity status.

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"P2P"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "P2P" }
  }'
```

**Example Response:**

```json
{
  "params": {
    "table": {
      "Enable": true,
      "Status": "Online",
      "SN": "ABC123DEF456"
    }
  },
  "result": true
}
```

---

## UPnP

### Get UPnP Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"UPnP"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "UPnP" }
  }'
```

---

## Network Diagnostics

### Ping Test

Test network connectivity to an address.

**Method:** `netApp.ping`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | IP or hostname to ping |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "netApp.ping",
    "params": {
      "address": "8.8.8.8"
    }
  }'
```

---

### Check IP Conflict

Check if an IP address conflicts with existing devices.

**Method:** `netApp.checkIPConflict`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `ip` | string | IP address to check |
| `interface` | string | Network interface (e.g., "eth0") |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "netApp.checkIPConflict",
    "params": {
      "ip": "192.168.1.101",
      "interface": "eth0"
    }
  }'
```

---

## SNMP

### Get SNMP Configuration

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"SNMP"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "SNMP" }
  }'
```

---

## Firewall

### Get Access Control List

**Method:** `configManager.getConfig`

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | `"AccessControl"` |

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "session": "YOUR_SESSION_ID",
    "method": "configManager.getConfig",
    "params": { "name": "AccessControl" }
  }'
```

---

## Complete Example

Here's a complete example to get all network settings:

```javascript
async function getNetworkConfig(apiUrl, session) {
  const configs = [
    'Network',
    'TCPPort',
    'HTTP',
    'HTTPS',
    'RTSP',
    'Email',
    'FTP',
    'P2P'
  ];

  const results = {};

  for (const name of configs) {
    try {
      const response = await fetch(`${apiUrl}/api/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          method: 'configManager.getConfig',
          params: { name }
        })
      });
      
      const data = await response.json();
      results[name] = data.data?.params?.table;
    } catch (error) {
      results[name] = { error: error.message };
    }
  }

  return results;
}

// Usage
const networkConfig = await getNetworkConfig('http://localhost:3000', session);
console.log('Network IP:', networkConfig.Network?.eth0?.IPAddress);
console.log('HTTP Port:', networkConfig.HTTP?.Port);
console.log('RTSP Port:', networkConfig.RTSP?.Port);
```
