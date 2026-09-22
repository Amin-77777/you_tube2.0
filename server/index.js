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

dotenv.config();

const app = express();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(uploadsDir));
app.get("/test", (req, res) => {
  res.sendFile(path.resolve("uploads/2026-07-21T16-53-50.655Z-1v_0_20260623153455_processed.mp4"));
});
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.get("/test", (req, res) => {
  res.send("Test route working");
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

app.get("/files", (req, res) => {
  res.sendFile(path.resolve("uploads", "2026-07-21T16-53-50.655Z-1v_0_20260623153455_processed.mp4"));
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
const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
