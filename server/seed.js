import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import path from "path";
import { fileURLToPath } from "url";
import Video from "./Modals/video.js";
import { SAMPLE_VIDEOS } from "./controllers/video.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Could not set custom DNS:", e.message);
}

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

async function seedDatabase(dbUri, label) {
  console.log(`\n=== Seeding ${label} (${dbUri.includes("@") ? "Atlas" : dbUri}) ===`);
  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 6000 });
    console.log(`Connected to ${label} successfully!`);

    // Clean up broken or duplicate old titles like "bag" or raw filenames
    const oldBag = await Video.findOne({ videotitle: "bag" });
    if (oldBag) {
      await Video.deleteOne({ _id: oldBag._id });
      console.log(`Removed outdated test entry: "bag"`);
    }

    const oldLv = await Video.findOne({ videotitle: "lv_0_20260623153455_processed.mp4" });
    if (oldLv) {
      await Video.deleteOne({ _id: oldLv._id });
      console.log(`Removed raw filename entry: "lv_0_20260623153455_processed.mp4"`);
    }

    // Clean up any broken 403 commondatastorage URLs
    const deletedBroken = await Video.deleteMany({
      filepath: { $regex: "commondatastorage.googleapis.com" },
    });
    if (deletedBroken.deletedCount > 0) {
      console.log(`Cleaned up ${deletedBroken.deletedCount} broken 403 video links.`);
    }

    for (const sample of SAMPLE_VIDEOS) {
      const exists = await Video.findOne({ videotitle: sample.videotitle });

      if (!exists) {
        await Video.create(sample);
        console.log(`+ Added: "${sample.videotitle}"`);
      } else {
        await Video.updateOne(
          { _id: exists._id },
          {
            $set: {
              videotitle: sample.videotitle,
              filepath: sample.filepath,
              thumbnail: sample.thumbnail,
              duration: sample.duration,
              videochanel: sample.videochanel,
              filesize: sample.filesize,
            },
          }
        );
        console.log(`~ Updated: "${sample.videotitle}" with unique working thumbnail`);
      }
    }

    const allVideos = await Video.find().sort({ createdAt: -1 });
    console.log(`Total videos in ${label}: ${allVideos.length}`);
    allVideos.forEach((v, idx) => {
      console.log(`${idx + 1}. [${v.duration || "0:30"}] "${v.videotitle}"`);
      console.log(`   Video: ${v.filepath}`);
      console.log(`   Thumb: ${v.thumbnail}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error(`Error seeding ${label}:`, error.message);
  }
}

async function runSeed() {
  const primaryDb =
    process.env.DB_URL ||
    "mongodb+srv://youtubeapp:Amin2015@cluster0.oyurk1w.mongodb.net/?appName=Cluster0";
  if (primaryDb) {
    await seedDatabase(primaryDb, "Atlas MongoDB");
  }

  const localDb = "mongodb://127.0.0.1:27017/youtube";
  if (primaryDb !== localDb) {
    await seedDatabase(localDb, "Local MongoDB");
  }

  process.exit(0);
}

runSeed();
