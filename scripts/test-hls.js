const baseUrl = process.argv[2] || "http://localhost:3000";
const host = process.argv[3] || "http://cam.lab";

const username = "admin";
const password = "Minhmeo75321@";
const channel = 1;
const subtype = 0;
const rtspPort = 80;

async function requestJson(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

async function waitForPlaylist(url, attempts, delayMs) {
  for (let i = 0; i < attempts; i += 1) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const body = await res.text();
      if (body.includes("#EXTM3U")) {
        return body;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

async function main() {
  console.log(`Base API: ${baseUrl}`);
  console.log(`Device host: ${host}`);

  const login = await requestJson("/api/login", {
    method: "POST",
    body: JSON.stringify({ host, username, password }),
  });

  if (login.status !== 200 || !login.body?.session) {
    console.error("Login failed:", login);
    process.exit(1);
  }

  const session = login.body.session;
  console.log(`Session: ${session}`);

  const start = await requestJson("/api/streams/hls/start", {
    method: "POST",
    body: JSON.stringify({ session, channel, subtype, rtspPort }),
  });

  if (start.status !== 200 || !start.body?.playlistUrl) {
    console.error("HLS start failed:", start);
    process.exit(1);
  }

  const playlistUrl = start.body.playlistUrl;
  console.log(`Playlist: ${playlistUrl}`);

  const playlist = await waitForPlaylist(playlistUrl, 10, 500);
  if (!playlist) {
    console.error("Playlist not ready after retries.");
    process.exit(1);
  }

  console.log("HLS playlist ready. First lines:");
  console.log(playlist.split("\n").slice(0, 8).join("\n"));
  console.log("\nOpen the playlist URL in a browser or use hls.js.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
