import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import video from "../Modals/video.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pool of 15+ diverse, high-quality thumbnails for automatic assignment
export const CURATED_FALLBACK_THUMBNAILS = [
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80", // Gaming esports
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80", // Tech motherboard
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80", // Web development
  "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=80", // Film camera & cinema
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80", // Music studio & audio
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80", // Concert DJ lights
  "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80", // Coding screen
  "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80", // Retro arcade gaming
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80", // Tropical beach travel
  "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80", // Fitness workout
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80", // Culinary food & cooking
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80", // Sci-fi galaxy & aurora
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=80", // Sports car racing
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80", // Digital technology & AI
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80", // Education & learning
];

export function getProceduralThumbnail(seedStr = "") {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % CURATED_FALLBACK_THUMBNAILS.length;
  return CURATED_FALLBACK_THUMBNAILS[idx];
}

// 11 distinct, verified, playable videos with 100% unique thumbnails and durable CDN streaming
export const SAMPLE_VIDEOS = [
  {
    videotitle: "Big Buck Bunny - Animated 3D Short Film",
    filename: "big_buck_bunny.mp4",
    filetype: "video/mp4",
    filepath: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files/big_buck_bunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    filesize: "5.5MB",
    duration: "0:33",
    videochanel: "Blender Studio",
    Like: 14200,
    views: 385000,
    uploader: "admin",
  },
  {
    videotitle: "Deep Ocean Bioluminescent Jellyfish 4K",
    filename: "Jellyfish.mp4",
    filetype: "video/mp4",
    filepath: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4",
    thumbnail: "https://images.unsplash.com/photo-1548232979-6c557ee14752?w=800&auto=format&fit=crop&q=80",
    filesize: "1.0MB",
    duration: "0:10",
    videochanel: "Wild Nature Explorer",
    Like: 8900,
    views: 215000,
    uploader: "admin",
  },
  {
    videotitle: "Sintel - Fantasy Dragon Story Short Film",
    filename: "Sintel.mp4",
    filetype: "video/mp4",
    filepath: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    filesize: "1.0MB",
    duration: "0:52",
    videochanel: "Durian Animation",
    Like: 18200,
    views: 450000,
    uploader: "admin",
  },
  {
    videotitle: "Timelapse: Blooming Spring Garden & Flowers",
    filename: "flower.mp4",
    filetype: "video/mp4",
    filepath: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnail: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&auto=format&fit=crop&q=80",
    filesize: "1.1MB",
    duration: "0:05",
    videochanel: "Botanical Wonders",
    Like: 12500,
    views: 290000,
    uploader: "admin",
  },
  {
    videotitle: "Retro Groove: 80s Synthwave Visuals & Audio",
    filename: "echo-hereweare.mp4",
    filetype: "video/mp4",
    filepath: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files/echo-hereweare.mp4",
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80",
    filesize: "5.4MB",
    duration: "0:45",
    videochanel: "Sound & Vision Lab",
    Like: 9500,
    views: 180000,
    uploader: "admin",
  },
  {
    videotitle: "Modern City Night Drive & Lights in 4K",
    filename: "chrome.mp4",
    filetype: "video/mp4",
    filepath: "https://webrtc.github.io/samples/src/video/chrome.mp4",
    thumbnail: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800&auto=format&fit=crop&q=80",
    filesize: "2.3MB",
    duration: "0:15",
    videochanel: "Urban Motion",
    Like: 7400,
    views: 154000,
    uploader: "admin",
  },
  {
    videotitle: "Weekend Chill: Peaceful Mountain Sunset",
    filename: "friday.mp4",
    filetype: "video/mp4",
    filepath: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
    thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
    filesize: "0.5MB",
    duration: "0:08",
    videochanel: "Serenity Scenery",
    Like: 11200,
    views: 245000,
    uploader: "admin",
  },
  {
    videotitle: "Introduction to YourTube",
    filename: "oceans.mp4",
    filetype: "video/mp4",
    filepath: "https://vjs.zencdn.net/v/oceans.mp4",
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80",
    filesize: "3.5MB",
    duration: "0:46",
    videochanel: "Official Channel",
    Like: 24,
    views: 226,
    uploader: "admin",
  },
  {
    videotitle: "Mobile Cinematic Video & Highlights",
    filename: "bunny_trailer.mp4",
    filetype: "video/mp4",
    filepath: "https://media.w3.org/2010/05/bunny/trailer.mp4",
    thumbnail: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=800&auto=format&fit=crop&q=80",
    filesize: "4.8MB",
    duration: "0:32",
    videochanel: "Creator Studio",
    Like: 45,
    views: 310,
    uploader: "admin",
  },
  {
    videotitle: "Urban Street Style & Everyday Bag Tour",
    filename: "nature_movie.mp4",
    filetype: "video/mp4",
    filepath: "https://www.w3schools.com/tags/movie.mp4",
    thumbnail: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80",
    filesize: "1.2MB",
    duration: "0:12",
    videochanel: "Style & Gear",
    Like: 78,
    views: 520,
    uploader: "user",
  },
  {
    videotitle: "Action Camera Adventure & Vlog",
    filename: "blue_moon.mp4",
    filetype: "video/mp4",
    filepath: "https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-576p.mp4",
    thumbnail: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80",
    filesize: "8.2MB",
    duration: "0:30",
    videochanel: "Adventure Trails",
    Like: 92,
    views: 640,
    uploader: "user",
  },
];

// Helper to save base64 data URL to an image file on disk
function saveBase64Thumbnail(base64Str, prefix = "thumb") {
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const ext = matches[1].includes("png") ? ".png" : matches[1].includes("webp") ? ".webp" : ".jpg";
    const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
    const buffer = Buffer.from(matches[2], "base64");

    const serverUploads = path.resolve(__dirname, "../uploads");
    if (!fs.existsSync(serverUploads)) {
      fs.mkdirSync(serverUploads, { recursive: true });
    }
    const serverPath = path.join(serverUploads, filename);
    fs.writeFileSync(serverPath, buffer);

    // Also mirror to yourtube/public/uploads if it exists
    const publicPath = path.resolve(__dirname, "../../yourtube/public/uploads", filename);
    const publicDir = path.dirname(publicPath);
    if (fs.existsSync(publicDir)) {
      try {
        fs.writeFileSync(publicPath, buffer);
      } catch (_) {}
    }

    return `uploads/${filename}`;
  } catch (err) {
    console.warn("Failed to save base64 thumbnail:", err.message);
    return null;
  }
}

// Helper to mirror a file to yourtube/public/uploads
function mirrorToPublic(sourcePath, filename) {
  try {
    const publicDir = path.resolve(__dirname, "../../yourtube/public/uploads");
    if (fs.existsSync(publicDir)) {
      const dest = path.join(publicDir, filename);
      if (!fs.existsSync(dest) && fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, dest);
      }
    }
  } catch (e) {
    console.warn("Could not mirror file to public/uploads:", e.message);
  }
}

export const uploadvideo = async (req, res) => {
  // Support both single file and multi-field upload
  const videoFile = req.files?.file?.[0] || req.file;
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile) {
    return res
      .status(400)
      .json({ message: "Please upload a valid video file" });
  }

  try {
    const videoBaseName = path.basename(videoFile.path || videoFile.filename);
    const normalizedVideoPath = `uploads/${videoBaseName}`;
    const formattedSize = videoFile.size
      ? `${(videoFile.size / (1024 * 1024)).toFixed(1)}MB`
      : "Unknown";

    // Mirror video file to public/uploads
    if (videoFile.path) {
      mirrorToPublic(videoFile.path, videoBaseName);
    }

    const title = (req.body.videotitle || videoFile.originalname || "Untitled Video").trim();
    let thumbnailSrc = "";

    if (thumbnailFile) {
      const thumbBaseName = path.basename(thumbnailFile.path || thumbnailFile.filename);
      thumbnailSrc = `uploads/${thumbBaseName}`;
      if (thumbnailFile.path) {
        mirrorToPublic(thumbnailFile.path, thumbBaseName);
      }
    } else if (req.body.thumbnail && typeof req.body.thumbnail === "string") {
      const rawThumb = req.body.thumbnail.trim();
      if (rawThumb.startsWith("data:image/")) {
        const savedPath = saveBase64Thumbnail(rawThumb, "thumb");
        thumbnailSrc = savedPath || rawThumb;
      } else if (rawThumb.length > 0) {
        thumbnailSrc = rawThumb;
      }
    }

    // If still no thumbnail, assign a deterministic unique cover
    if (!thumbnailSrc) {
      thumbnailSrc = getProceduralThumbnail(title + videoBaseName);
    }

    const file = new video({
      videotitle: title,
      filename: videoFile.originalname || videoBaseName,
      filepath: normalizedVideoPath,
      filetype: videoFile.mimetype || "video/mp4",
      filesize: formattedSize,
      videochanel: req.body.videochanel || "Community Channel",
      uploader: req.body.uploader || "user",
      thumbnail: thumbnailSrc,
      duration: req.body.duration || "0:30",
    });

    await file.save();
    return res.status(201).json({ message: "File uploaded successfully", video: file });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const updateVideo = async (req, res) => {
  const { id } = req.params;
  try {
    const videoDoc = await video.findById(id);
    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found" });
    }

    const { videotitle, thumbnail, videochanel, duration } = req.body;

    if (videotitle) videoDoc.videotitle = videotitle;
    if (videochanel) videoDoc.videochanel = videochanel;
    if (duration) videoDoc.duration = duration;

    // Handle thumbnail uploaded as a file
    if (req.file) {
      const thumbBase = path.basename(req.file.path || req.file.filename);
      videoDoc.thumbnail = `uploads/${thumbBase}`;
      if (req.file.path) {
        mirrorToPublic(req.file.path, thumbBase);
      }
    } else if (thumbnail !== undefined && thumbnail !== null) {
      const rawThumb = String(thumbnail).trim();
      if (rawThumb.startsWith("data:image/")) {
        const saved = saveBase64Thumbnail(rawThumb, "thumb");
        videoDoc.thumbnail = saved || rawThumb;
      } else {
        videoDoc.thumbnail = rawThumb;
      }
    }

    await videoDoc.save();
    return res.status(200).json({
      message: "Video updated successfully",
      video: videoDoc,
    });
  } catch (error) {
    console.error("Update video error:", error);
    return res.status(500).json({ message: "Failed to update video", error: error.message });
  }
};

export const getallvideo = async (req, res) => {
  try {
    let files = await video.find().sort({ createdAt: -1 });
    if (!files || files.length === 0) {
      console.log("[Video Controller] No videos found in database. Auto-seeding sample videos...");
      files = await video.insertMany(SAMPLE_VIDEOS);
    }
    return res.status(200).send(files);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

export const seedvideo = async (req, res) => {
  try {
    for (const sample of SAMPLE_VIDEOS) {
      // Find by exact title or match by filename
      const exists = await video.findOne({
        $or: [
          { videotitle: sample.videotitle },
          { filename: sample.filename },
          { filepath: sample.filepath },
        ],
      });

      if (!exists) {
        await video.create(sample);
      } else {
        await video.updateOne(
          { _id: exists._id },
          {
            $set: {
              videotitle: sample.videotitle,
              thumbnail: sample.thumbnail,
              filepath: sample.filepath,
              duration: sample.duration,
              videochanel: sample.videochanel,
              filesize: sample.filesize,
            },
          }
        );
      }
    }

    const files = await video.find().sort({ createdAt: -1 });
    return res.status(200).json({
      message: "Videos updated with distinct working thumbnails and paths successfully.",
      count: files.length,
      videos: files,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return res.status(500).json({ message: "Failed to seed videos", error: error.message });
  }
};
