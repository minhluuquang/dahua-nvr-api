import { createRoute } from "@hono/zod-openapi";
import { app } from "../app";
import { getSession } from "../services/session";
import { streamManager } from "../services/streams";
import {
  ErrorSchema,
  StreamStartRequestSchema,
  StreamStartResponseSchema,
  StreamStopResponseSchema,
  StreamSdpResponseSchema,
  HlsStartRequestSchema,
  HlsStartResponseSchema,
  HlsStopResponseSchema,
  HlsFileParamSchema,
  StreamIdParamSchema,
} from "../schemas";

const streamStartRoute = createRoute({
  method: "post",
  path: "/api/streams/start",
  tags: ["Streams"],
  summary: "Start a live stream",
  description: "Starts an RTSP-over-WebSocket session and returns a stream ID.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: StreamStartRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Stream started",
      content: {
        "application/json": {
          schema: StreamStartResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const streamStopRoute = createRoute({
  method: "post",
  path: "/api/streams/{id}/stop",
  tags: ["Streams"],
  summary: "Stop a live stream",
  description: "Stops an active RTSP-over-WebSocket session.",
  request: {
    params: StreamIdParamSchema,
  },
  responses: {
    200: {
      description: "Stream stopped",
      content: {
        "application/json": {
          schema: StreamStopResponseSchema,
        },
      },
    },
    404: {
      description: "Stream not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const streamSdpRoute = createRoute({
  method: "get",
  path: "/api/streams/{id}/sdp",
  tags: ["Streams"],
  summary: "Get stream SDP",
  description: "Returns the SDP for an active stream.",
  request: {
    params: StreamIdParamSchema,
  },
  responses: {
    200: {
      description: "SDP retrieved",
      content: {
        "application/sdp": {
          schema: StreamSdpResponseSchema,
        },
      },
    },
    404: {
      description: "Stream not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const hlsStartRoute = createRoute({
  method: "post",
  path: "/api/streams/hls/start",
  tags: ["Streams"],
  summary: "Start an HLS stream",
  description: "Starts an FFmpeg HLS stream and returns the playlist URL.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: HlsStartRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "HLS stream started",
      content: {
        "application/json": {
          schema: HlsStartResponseSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const hlsStopRoute = createRoute({
  method: "post",
  path: "/api/streams/hls/{id}/stop",
  tags: ["Streams"],
  summary: "Stop an HLS stream",
  description: "Stops an FFmpeg HLS stream.",
  request: {
    params: StreamIdParamSchema,
  },
  responses: {
    200: {
      description: "HLS stream stopped",
      content: {
        "application/json": {
          schema: HlsStopResponseSchema,
        },
      },
    },
    404: {
      description: "Stream not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

const hlsFileRoute = createRoute({
  method: "get",
  path: "/api/streams/hls/{id}/{file}",
  tags: ["Streams"],
  summary: "Get HLS playlist/segment",
  description: "Serves HLS playlist and segment files.",
  request: {
    params: HlsFileParamSchema,
  },
  responses: {
    200: {
      description: "HLS file",
      content: {
        "application/vnd.apple.mpegurl": {
          schema: StreamSdpResponseSchema,
        },
      },
    },
    404: {
      description: "File not found",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export function registerStreamRoutes() {
  app.openapi(streamStartRoute, async (c) => {
    try {
      const { session, channel, subtype } = c.req.valid("json");
      const client = getSession(session);

      if (!client) {
        return c.json(
          {
            success: false,
            error: "Session not found",
          },
          404
        );
      }

      const credentials = client.getRtspCredentials();
      const stream = await streamManager.startStream({
        host: credentials.host,
        username: credentials.username,
        password: credentials.password,
        channel,
        subtype: subtype ?? 0,
      });

      const host = c.req.header("host");
      const scheme = c.req.header("x-forwarded-proto") || "http";
      const wsUrl = `${scheme === "https" ? "wss" : "ws"}://${host}/api/streams/${stream.id}/ws`;

      return c.json(
        {
          success: true,
          streamId: stream.id,
          wsUrl,
        },
        200
      );
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Internal server error",
        },
        500
      );
    }
  });

  app.openapi(streamStopRoute, async (c) => {
    const { id } = c.req.valid("param");
    const stopped = streamManager.stopStream(id);

    if (!stopped) {
      return c.json(
        {
          success: false,
          error: "Stream not found",
        },
        404
      );
    }

    return c.json(
      {
        success: true,
        message: "Stream stopped",
      },
      200
    );
  });

  app.openapi(streamSdpRoute, async (c) => {
    const { id } = c.req.valid("param");
    const sdp = streamManager.getSdp(id);
    if (!sdp) {
      return c.json(
        {
          success: false,
          error: "Stream not found",
        },
        404
      );
    }

    return c.text(sdp, 200, {
      "Content-Type": "application/sdp",
    });
  });

  app.openapi(hlsStartRoute, async (c) => {
    try {
      const { session, channel, subtype, rtspPort } = c.req.valid("json");
      const client = getSession(session);

      if (!client) {
        return c.json(
          {
            success: false,
            error: "Session not found",
          },
          404
        );
      }

      const credentials = client.getRtspCredentials();
      const stream = await streamManager.startHlsStream({
        host: credentials.host,
        username: credentials.username,
        password: credentials.password,
        channel,
        subtype: subtype ?? 0,
        rtspPort,
      });

      const host = c.req.header("host");
      const scheme = c.req.header("x-forwarded-proto") || "http";
      const playlistUrl = `${scheme}://${host}/api/streams/hls/${stream.id}/index.m3u8`;

      return c.json(
        {
          success: true,
          streamId: stream.id,
          playlistUrl,
        },
        200
      );
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Internal server error",
        },
        500
      );
    }
  });

  app.openapi(hlsStopRoute, async (c) => {
    const { id } = c.req.valid("param");
    const stopped = streamManager.stopHlsStream(id);

    if (!stopped) {
      return c.json(
        {
          success: false,
          error: "Stream not found",
        },
        404
      );
    }

    return c.json(
      {
        success: true,
        message: "HLS stream stopped",
      },
      200
    );
  });

  app.openapi(hlsFileRoute, async (c) => {
    const { id, file } = c.req.valid("param");
    const info = await streamManager.getHlsFile(id, file);
    if (!info) {
      return c.json(
        {
          success: false,
          error: "File not found",
        },
        404
      );
    }

    const contentType = file.endsWith(".m3u8")
      ? "application/vnd.apple.mpegurl"
      : file.endsWith(".ts")
        ? "video/mp2t"
        : "application/octet-stream";

    const payload = new Uint8Array(info.data);
    return c.body(payload, 200, {
      "Content-Type": contentType,
      "Content-Length": info.size.toString(),
      "Cache-Control": "no-store",
    });
  });

  app.get("/player/hls/:id", (c) => {
    const { id } = c.req.param();
    const host = c.req.header("host");
    const scheme = c.req.header("x-forwarded-proto") || "http";
    const playlistUrl = `${scheme}://${host}/api/streams/hls/${id}/index.m3u8`;

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HLS Player</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #0f1115;
        color: #f5f5f5;
      }
      .wrap {
        max-width: 960px;
        margin: 40px auto;
        padding: 0 16px;
      }
      video {
        width: 100%;
        background: #000;
      }
      .meta {
        margin-top: 12px;
        font-size: 14px;
        color: #b9c0cc;
        word-break: break-all;
      }
      .note {
        margin-top: 8px;
        font-size: 13px;
        color: #8a93a3;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Live HLS</h1>
      <video id="player" controls autoplay muted playsinline></video>
      <div class="meta">Playlist: ${playlistUrl}</div>
      <div class="note">Chrome/Firefox uses hls.js; Safari uses native HLS.</div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
    <script>
      const video = document.getElementById("player");
      const src = "${playlistUrl}";
      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        video.insertAdjacentHTML("afterend", "<div class='note'>Your browser does not support HLS playback.</div>");
      }
    </script>
  </body>
</html>`;

    return c.html(html);
  });
}
