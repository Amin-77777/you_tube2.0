import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  saveWatchProgress,
  getWatchProgress,
} from "../controllers/history.js";

const routes = express.Router();
routes.get("/progress/:videoId", getWatchProgress);
routes.post("/progress/:videoId", saveWatchProgress);
routes.get("/:userId", getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", handlehistory);
export default routes;
