import mongoose from "mongoose";
import watchlater from "../Modals/watchlater.js";

export const handlewatchlater = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  try {
    if (!userId || !videoId || !mongoose.Types.ObjectId.isValid(videoId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ watchlater: false });
    }
    const exisitingwatchlater = await watchlater.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (exisitingwatchlater) {
      await watchlater.findByIdAndDelete(exisitingwatchlater._id);
      return res.status(200).json({ watchlater: false });
    } else {
      await watchlater.create({ viewer: userId, videoid: videoId });
      return res.status(200).json({ watchlater: true });
    }
  } catch (error) {
    console.error("handlewatchlater error:", error.message || error);
    return res.status(200).json({ watchlater: false });
  }
};

export const getallwatchlater = async (req, res) => {
  const { userId } = req.params;
  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json([]);
    }
    const watchlatervideo = await watchlater
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(watchlatervideo);
  } catch (error) {
    console.error("getallwatchlater error:", error.message || error);
    return res.status(200).json([]);
  }
};
