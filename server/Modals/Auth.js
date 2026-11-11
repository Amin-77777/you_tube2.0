import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
  preferredLanguage: { type: String, default: "en" },
  showLocationInComments: { type: Boolean, default: true },
  isCommentBanned: { type: Boolean, default: false },
  commentSuspendedUntil: { type: Date, default: null },
  notificationPreferences: {
    replies: { type: Boolean, default: true },
    likes: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
  },
  joinedon: { type: Date, default: Date.now },
  themePreference: { type: String, enum: ["auto", "light", "dark"], default: "auto" },
  registeredEmailVerified: { type: Boolean, default: true },
  registeredPhone: { type: String, default: null },
  registeredPhoneVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String },
  lastLoginLocation: { type: String },
});

export default mongoose.model("user", userschema);
