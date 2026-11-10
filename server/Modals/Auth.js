import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
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
