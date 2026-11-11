import mongoose from "mongoose";
import video from "../Modals/video.js";
import history from "../Modals/history.js";

export const handlehistory = async (req, res) => {
  const { userId, playbackPosition, duration, percentageWatched, isCompleted } = req.body;
  const { videoId } = req.params;
  try {
    if (!userId || !videoId) {
      return res.status(400).json({ message: "userId and videoId are required" });
    }

    const isValidVideoId = mongoose.Types.ObjectId.isValid(videoId);
    const isValidUserId = mongoose.Types.ObjectId.isValid(userId);

    // If either ID is not a MongoDB ObjectId (e.g. fallback video like 'default-1' or guest),
    // return success gracefully without throwing CastError
    if (!isValidVideoId || !isValidUserId) {
      return res.status(200).json({ history: true, progress: null });
    }

    const existing = await history.findOne({ viewer: userId, videoid: videoId });
    if (!existing) {
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    }
    const record = await history.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      {
        $set: {
          viewer: userId,
          videoid: videoId,
          likedon: new Date(),
          lastWatched: new Date(),
          ...(playbackPosition !== undefined && { playbackPosition: Number(playbackPosition) || 0 }),
          ...(duration !== undefined && { duration: Number(duration) || 0 }),
          ...(percentageWatched !== undefined && { percentageWatched: Number(percentageWatched) || 0 }),
          ...(isCompleted !== undefined && { isCompleted: Boolean(isCompleted) }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ history: true, progress: record });
  } catch (error) {
    console.error("handlehistory error:", error.message || error);
    return res.status(200).json({ history: true, progress: null });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    if (videoId && mongoose.Types.ObjectId.isValid(videoId)) {
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("handleview error:", error.message || error);
    return res.status(200).json({ success: true });
  }
};

export const saveWatchProgress = async (req, res) => {
  const { videoId } = req.params;
  const { userId, playbackPosition, duration, percentageWatched, isCompleted } = req.body;
  try {
    if (!userId || !videoId) {
      return res.status(400).json({ message: "userId and videoId are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ success: true, progress: null });
    }

    const updateData = {
      viewer: userId,
      videoid: videoId,
      playbackPosition: Number(playbackPosition) || 0,
      duration: Number(duration) || 0,
      percentageWatched: Math.min(100, Math.max(0, Number(percentageWatched) || 0)),
      lastWatched: new Date(),
    };
    if (typeof isCompleted === "boolean") {
      updateData.isCompleted = isCompleted;
    }
    const record = await history.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ success: true, progress: record });
  } catch (error) {
    console.error("saveWatchProgress error:", error.message || error);
    return res.status(200).json({ success: true, progress: null });
  }
};

export const getWatchProgress = async (req, res) => {
  const { videoId } = req.params;
  const userId = req.query.userId || req.headers["x-user-id"];
  try {
    if (!userId || !videoId || !mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ progress: null });
    }
    const record = await history.findOne({ viewer: userId, videoid: videoId });
    return res.status(200).json({ success: true, progress: record });
  } catch (error) {
    console.error("getWatchProgress error:", error.message || error);
    return res.status(200).json({ progress: null });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json([]);
    }
    const historyvideo = await history
      .find({ viewer: userId })
      .sort({ updatedAt: -1, lastWatched: -1 })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error("getallhistoryVideo error:", error.message || error);
    return res.status(200).json([]);
  }
};
