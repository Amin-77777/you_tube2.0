import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  console.log("Checking Atlas:", process.env.DB_URL);
  try {
    await mongoose.connect(process.env.DB_URL);
    const atlasVideos = await mongoose.connection.collection("videofiles").find().toArray();
    console.log("Atlas video count:", atlasVideos.length);
    atlasVideos.forEach(v => console.log("Atlas:", v.videotitle, "| path:", v.filepath, "| thumb:", v.thumbnail));
    await mongoose.disconnect();
  } catch (e) {
    console.error("Atlas check failed:", e.message);
  }

  console.log("\nChecking Local Mongo (youtube):");
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/youtube");
    const localVideos = await mongoose.connection.collection("videofiles").find().toArray();
    console.log("Local video count:", localVideos.length);
    localVideos.forEach(v => console.log("Local:", v.videotitle, "| path:", v.filepath, "| thumb:", v.thumbnail));
    await mongoose.disconnect();
  } catch (e) {
    console.error("Local check failed:", e.message);
  }
}

check();
