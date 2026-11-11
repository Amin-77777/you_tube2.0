import express from "express";
import {
  getAdminComments,
  getAdminCommentReports,
  moderateComment,
  getCommentFullHistory,
  suspendUserComments,
  unsuspendUserComments,
  getModerationAuditLogs,
  searchUsersForAdmin,
} from "../controllers/adminModeration.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// All routes require administrator permissions
router.use(requireAdmin);

router.get("/comments", getAdminComments);
router.get("/comment-reports", getAdminCommentReports);
router.get("/moderation-logs", getModerationAuditLogs);
router.get("/users", searchUsersForAdmin);
router.put("/comments/:commentId/moderate", moderateComment);
router.get("/comments/:commentId/history", getCommentFullHistory);
router.post("/users/:userId/suspend-comments", suspendUserComments);
router.post("/users/:userId/unsuspend-comments", unsuspendUserComments);

export default router;
