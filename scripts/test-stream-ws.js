import WebSocket from "ws";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node scripts/test-stream-ws.js <ws-url>");
  process.exit(1);
}

const ws = new WebSocket(url);
let count = 0;

ws.on("open", () => {
  console.log(`connected to ${url}`);
});

ws.on("message", (data) => {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  count += 1;
  const isInterleaved = buffer[0] === 0x24;
  const channel = isInterleaved ? buffer[1] : null;
  const length = isInterleaved && buffer.length >= 4 ? buffer.readUInt16BE(2) : buffer.length;

  if (count <= 5) {
    console.log(
      `[packet ${count}] bytes=${buffer.length} interleaved=${isInterleaved} channel=${channel} length=${length}`
    );
  }

  if (count === 5) {
    console.log("... continuing (press Ctrl+C to stop)");
  }
});

ws.on("close", (code, reason) => {
  console.log(`closed code=${code} reason=${reason.toString()}`);
});

ws.on("error", (err) => {
  console.error("error", err);
});
