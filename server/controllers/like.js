import mongoose from "mongoose";
import video from "../Modals/video.js";
import like from "../Modals/like.js";

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    if (!userId || !videoId || !mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ liked: false });
    }
    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (exisitinglike) {
      await like.findByIdAndDelete(exisitinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      return res.status(200).json({ liked: false });
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
      return res.status(200).json({ liked: true });
    }
  } catch (error) {
    console.error("handlelike error:", error.message || error);
    return res.status(200).json({ liked: false });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json([]);
    }
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error("getallLikedVideo error:", error.message || error);
    return res.status(200).json([]);
  }
};
