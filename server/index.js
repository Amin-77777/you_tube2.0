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
if (!process.env.RENDER) {
  dotenv.config();
}
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(process.cwd() + "/uploads"));
app.get("/test", (req, res) => {
  res.sendFile(path.resolve("uploads/2026-07-21T16-53-50.655Z-1v_0_20260623153455_processed.mp4"));
});
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.get("/test", (req, res) => {
  res.send("Test route working");
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

app.listen(PORT, () => {
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
