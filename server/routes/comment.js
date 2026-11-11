import express from "express";
import {
  postcomment,
  getallcomment,
  editcomment,
  deletecomment,
  getCommentReplies,
  toggleReaction,
  translateCommentHandler,
  reportComment,
  getCommentEditHistory,
  searchMentionUsers,
  getCaptchaChallenge,
} from "../controllers/comment.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = express.Router();

// Public / Optional Auth comment retrieval
router.get("/users/mentions", searchMentionUsers);
router.get("/captcha/challenge", getCaptchaChallenge);

// Legacy routes (mounted under /comment)
router.get("/:videoid", optionalAuth, getallcomment);
router.post("/postcomment", optionalAuth, postcomment);
router.delete("/deletecomment/:id", optionalAuth, deletecomment);
router.post("/editcomment/:id", optionalAuth, editcomment);

// RESTful routes
router.get("/content/:contentId", optionalAuth, getallcomment);
router.get("/:commentId/replies", optionalAuth, getCommentReplies);
router.get("/:commentId/history", optionalAuth, getCommentEditHistory);

router.post("/", optionalAuth, postcomment);
router.put("/:commentId", optionalAuth, editcomment);
router.delete("/:commentId", optionalAuth, deletecomment);

// Reactions
router.post("/:commentId/reaction", optionalAuth, toggleReaction);
router.delete("/:commentId/reaction", optionalAuth, toggleReaction);

// Translation
router.post("/:commentId/translate", optionalAuth, translateCommentHandler);

// Reporting
router.post("/:commentId/report", optionalAuth, reportComment);

export default router;
