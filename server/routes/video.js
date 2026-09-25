import express from "express";
import { getallvideo, uploadvideo, seedvideo, updateVideo } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post(
  "/upload",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  uploadvideo
);

routes.get("/getall", getallvideo);
routes.get("/seed", seedvideo);
routes.post("/seed", seedvideo);

// Update video thumbnail and metadata
routes.put("/update/:id", upload.single("thumbnail"), updateVideo);
routes.patch("/:id", upload.single("thumbnail"), updateVideo);
routes.post("/update/:id", upload.single("thumbnail"), updateVideo);

export default routes;

