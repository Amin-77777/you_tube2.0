import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import { createServer } from "http";
import { Server } from "socket.io";
import { setupSocketIO } from "./socketHandler.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dns from "node:dns";

// Ensure reliable DNS resolution for MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();

const serverUploadsDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(serverUploadsDir)) {
  fs.mkdirSync(serverUploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

const MIME_MAP = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

// Helper to find an uploaded file across common location candidates
function resolveUploadPath(filename) {
  if (!filename) return null;
  const decoded = decodeURIComponent(filename);
  const sanitized = path.basename(decoded);
  const candidates = [
    path.join(serverUploadsDir, sanitized),
    path.join(process.cwd(), "uploads", sanitized),
    path.join(process.cwd(), "server", "uploads", sanitized),
    path.join(process.cwd(), "yourtube", "public", "uploads", sanitized),
    path.join(__dirname, "..", "yourtube", "public", "uploads", sanitized),
    path.join(process.cwd(), "yourtube", "public", "video", sanitized),
    path.join(__dirname, "..", "yourtube", "public", "video", sanitized),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// Support OPTIONS preflight for uploads
app.options("/uploads/:filename", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Origin, Content-Type, Accept, Cache-Control");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Type");
  res.sendStatus(204);
});

// Dedicated streaming route with HTTP 206 Partial Content support for videos and proper image serving
app.all("/uploads/:filename", (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const filePath = resolveUploadPath(req.params.filename);
  if (!filePath) {
    return res.status(404).json({ error: "Media file not found" });
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Origin, Content-Type, Accept, Cache-Control");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Type");
  res.setHeader("Accept-Ranges", "bytes");

  // Handle video streaming with Range requests
  if (contentType.startsWith("video/")) {
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, Content-Type",
      });

      if (req.method === "HEAD") {
        return res.end();
      }

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges, Content-Type",
      });

      if (req.method === "HEAD") {
        return res.end();
      }

      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    // Images and static assets
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size);
    if (req.method === "HEAD") {
      return res.end();
    }
    fs.createReadStream(filePath).pipe(res);
  }
});

// Fallback static middleware
app.use(
  "/uploads",
  express.static(serverUploadsDir, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (MIME_MAP[ext]) {
        res.setHeader("Content-Type", MIME_MAP[ext]);
      }
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

app.get("/", (req, res) => {
  res.send("You tube backend is working");
});


// Cache for Metered TURN credentials (valid for 10 minutes)
let cachedTurnData = null;
let lastTurnFetchTime = 0;

app.get("/api/turn-credentials", async (req, res) => {
  const globalStun = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:stun.services.mozilla.com" },
  ];

  const meteredDomain = process.env.METERED_DOMAIN || process.env.NEXT_PUBLIC_METERED_DOMAIN;
  const meteredApiKey = process.env.METERED_API_KEY || process.env.NEXT_PUBLIC_METERED_API_KEY || process.env.TURN_API_KEY;

  if (meteredDomain && meteredApiKey) {
    const now = Date.now();
    if (cachedTurnData && now - lastTurnFetchTime < 10 * 60 * 1000) {
      return res.json({ iceServers: cachedTurnData });
    }

    try {
      const response = await fetch(`https://${meteredDomain}.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`);
      if (response.ok) {
        const meteredServers = await response.json();
        if (Array.isArray(meteredServers)) {
          cachedTurnData = [...meteredServers, ...globalStun];
          lastTurnFetchTime = now;
          return res.json({ iceServers: cachedTurnData });
        }
      }
    } catch (err) {
      console.warn("[TURN API] Failed to fetch credentials from Metered:", err.message);
    }
  }

  const turnUrl = process.env.TURN_URL || process.env.NEXT_PUBLIC_TURN_URL;
  if (turnUrl) {
    const urls = turnUrl.split(",").map((u) => u.trim());
    const customTurn = {
      urls,
      username: process.env.TURN_USERNAME || process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.TURN_PASSWORD || process.env.NEXT_PUBLIC_TURN_PASSWORD,
    };
    return res.json({ iceServers: [customTurn, ...globalStun] });
  }

  return res.json({
    iceServers: globalStun,
    warning: "No TURN server configured. Cross-network NAT traversal may require METERED_DOMAIN and METERED_API_KEY.",
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "YouTube 2.0 Backend API",
    routes: {
      videos: "/video/getall",
      health: "/health",
      iceServers: "/api/ice-servers",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use(bodyParser.json());
app.use("/user", userroutes);
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
const PORT = process.env.PORT || 5000;



const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setupSocketIO(io);

httpServer.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
const DBURL = process.env.DB_URL || "mongodb://127.0.0.1:27017/youtube";
const LOCAL_DB = "mongodb://127.0.0.1:27017/youtube";

async function connectDB() {
  try {
    await mongoose.connect(DBURL, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB:", DBURL.includes("@") ? "MongoDB Atlas" : DBURL);
  } catch (error) {
    console.warn("Primary MongoDB connection failed:", error.message);
    if (DBURL !== LOCAL_DB) {
      try {
        console.log("Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/youtube)...");
        await mongoose.connect(LOCAL_DB, { serverSelectionTimeoutMS: 5000 });
        console.log("Connected to local MongoDB successfully!");
      } catch (fallbackError) {
        console.error("Local MongoDB fallback also failed:", fallbackError.message);
      }
    }
  }
}
connectDB();
