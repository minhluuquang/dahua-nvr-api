import WebSocket from "ws";
import http from "http";
import https from "https";
import { writeFileSync } from "fs";
import { createSocket } from "dgram";

const wsUrl = process.argv[2];
const sdpUrlArg = process.argv[3];
const sdpOut = process.argv[4] || "stream.sdp";

if (!wsUrl) {
  console.error("Usage: node scripts/ws-rtp-play.js <ws-url> [sdp-url] [sdp-out]");
  process.exit(1);
}

const videoPort = 5004;
const audioPort = 5006;

const sdpUrl = sdpUrlArg || deriveSdpUrl(wsUrl);

function deriveSdpUrl(url) {
  const replaced = url.replace(/^ws/, "http").replace(/\/ws$/, "/sdp");
  return replaced;
}

function fetchSdp(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`SDP fetch failed: ${res.statusCode}`));
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function rewriteSdp(sdp) {
  const lines = sdp.split("\r\n");
  const out = [];
  for (const line of lines) {
    if (line.startsWith("c=IN ")) {
      out.push("c=IN IP4 127.0.0.1");
      continue;
    }
    if (line.startsWith("m=video ")) {
      const rest = line.split(" ").slice(2).join(" ");
      out.push(`m=video ${videoPort} ${rest}`);
      continue;
    }
    if (line.startsWith("m=audio ")) {
      const rest = line.split(" ").slice(2).join(" ");
      out.push(`m=audio ${audioPort} ${rest}`);
      continue;
    }
    out.push(line);
  }
  return out.join("\r\n");
}

async function main() {
  const rawSdp = await fetchSdp(sdpUrl);
  const sdp = rewriteSdp(rawSdp);
  writeFileSync(sdpOut, sdp, "utf8");
  console.log(`Saved SDP to ${sdpOut}`);
  console.log(
    `ffplay -protocol_whitelist file,udp,rtp -i ${sdpOut}`
  );

  const videoSock = createSocket("udp4");
  const audioSock = createSocket("udp4");

  const ws = new WebSocket(wsUrl);
  let count = 0;

  ws.on("open", () => {
    console.log(`Connected to ${wsUrl}`);
  });

  ws.on("message", (data) => {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buffer.length < 4 || buffer[0] !== 0x24) {
      return;
    }

    const channel = buffer[1];
    const length = buffer.readUInt16BE(2);
    if (buffer.length < 4 + length) {
      return;
    }

    const payload = buffer.slice(4, 4 + length);

    if (channel === 0) {
      videoSock.send(payload, videoPort, "127.0.0.1");
    } else if (channel === 2) {
      audioSock.send(payload, audioPort, "127.0.0.1");
    }

    count += 1;
    if (count <= 3) {
      console.log(`Forwarded RTP packet channel=${channel} length=${length}`);
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`WS closed code=${code} reason=${reason.toString()}`);
    videoSock.close();
    audioSock.close();
  });

  ws.on("error", (err) => {
    console.error("WS error", err);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
