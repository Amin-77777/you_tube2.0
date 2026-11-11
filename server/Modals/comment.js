import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    // Legacy support field
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    videoId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
    },
    // Legacy support field
    videoid: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
      index: true,
    },
    originalText: {
      type: String,
      required: true,
    },
    // Legacy support field
    commentbody: {
      type: String,
    },
    usercommented: {
      type: String,
      default: "Anonymous",
    },
    userImage: {
      type: String,
      default: "",
    },
    userLocation: {
      type: String,
      default: "",
    },
    detectedLanguage: {
      type: String,
      default: "en",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    moderationStatus: {
      type: String,
      enum: ["Approved", "Pending", "Flagged", "Removed"],
      default: "Approved",
      index: true,
    },
    moderationReason: {
      type: String,
      default: "",
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    dislikesCount: {
      type: Number,
      default: 0,
    },
    repliesCount: {
      type: Number,
      default: 0,
    },
    reportsCount: {
      type: Number,
      default: 0,
      index: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    commentedon: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save synchronization hook between legacy and new fields
commentSchema.pre("validate", function (next) {
  if (!this.userId && this.userid) {
    this.userId = this.userid;
  }
  if (!this.userid && this.userId) {
    this.userid = this.userId;
  }
  if (!this.videoId && this.videoid) {
    this.videoId = this.videoid;
  }
  if (!this.videoid && this.videoId) {
    this.videoid = this.videoId;
  }
  if (!this.originalText && this.commentbody) {
    this.originalText = this.commentbody;
  }
  if (!this.commentbody && this.originalText) {
    this.commentbody = this.originalText;
  }
  if (!this.commentedon && this.createdAt) {
    this.commentedon = this.createdAt;
  }
  next();
});

// Compound indexes for optimal sorting and filtering
commentSchema.index({ videoId: 1, parentCommentId: 1, createdAt: -1 });
commentSchema.index({ videoId: 1, parentCommentId: 1, likesCount: -1 });
commentSchema.index({ videoId: 1, moderationStatus: 1 });
commentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("comment", commentSchema);
