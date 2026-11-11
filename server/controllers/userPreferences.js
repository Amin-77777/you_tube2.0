import mongoose from "mongoose";
import User from "../Modals/Auth.js";
import { SUPPORTED_LANGUAGES } from "../services/translationService.js";

/**
 * GET /api/user/comment-preferences
 * Retrieve user's language and comment privacy settings
 */
export const getUserPreferences = async (req, res) => {
  try {
    const authUser = req.user;
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"];

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const user = await User.findById(userId)
      .select("preferredLanguage showLocationInComments notificationPreferences role isCommentBanned commentSuspendedUntil")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      preferredLanguage: user.preferredLanguage || "en",
      showLocationInComments: user.showLocationInComments !== false,
      notificationPreferences: user.notificationPreferences || {
        replies: true,
        likes: true,
        mentions: true,
        moderation: true,
      },
      role: user.role || "user",
      isCommentBanned: user.isCommentBanned || false,
      commentSuspendedUntil: user.commentSuspendedUntil || null,
      supportedLanguages: SUPPORTED_LANGUAGES,
    });
  } catch (error) {
    console.error("[getUserPreferences] Error:", error);
    return res.status(500).json({ message: "Failed to fetch user preferences" });
  }
};

/**
 * PUT /api/user/comment-preferences
 * Update preferred language and privacy settings
 */
export const updateUserPreferences = async (req, res) => {
  try {
    const authUser = req.user;
    const userId = authUser?._id || authUser?.id || req.headers["x-user-id"];
    const { preferredLanguage, showLocationInComments, notificationPreferences } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const updates = {};
    if (preferredLanguage && SUPPORTED_LANGUAGES[preferredLanguage]) {
      updates.preferredLanguage = preferredLanguage;
    }
    if (typeof showLocationInComments === "boolean") {
      updates.showLocationInComments = showLocationInComments;
    }
    if (notificationPreferences && typeof notificationPreferences === "object") {
      updates.notificationPreferences = {
        replies: notificationPreferences.replies !== false,
        likes: notificationPreferences.likes !== false,
        mentions: notificationPreferences.mentions !== false,
        moderation: notificationPreferences.moderation !== false,
      };
    }

    const updated = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true })
      .select("preferredLanguage showLocationInComments notificationPreferences role")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      preferences: updated,
    });
  } catch (error) {
    console.error("[updateUserPreferences] Error:", error);
    return res.status(500).json({ message: "Failed to update preferences" });
  }
};
