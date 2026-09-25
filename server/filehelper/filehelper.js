"use strict";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + sanitized
    );
  },
});

const filefilter = (req, file, cb) => {
  const isVideoMime = file.mimetype && file.mimetype.startsWith("video/");
  const isVideoExt = /\.(mp4|webm|mov|mkv|avi|ogg|m4v)$/i.test(file.originalname);
  const isImageMime = file.mimetype && file.mimetype.startsWith("image/");
  const isImageExt = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.originalname);

  if (isVideoMime || isVideoExt || isImageMime || isImageExt) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format. Please upload a valid video or image file."), false);
  }
};

const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;

