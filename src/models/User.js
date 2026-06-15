import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    minlength: 6,
    required: true,
  },
  userType: {
    type: String,
    enum: ["student", "general", "admin"],
    default: "general",
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  subscriptionTier: {
    type: String,
    enum: ["free", "modern", "vip"],
    default: "free",
  },
  profileImage: { 
    type: String 
  },
  fcmToken: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });



export default mongoose.model("User", UserSchema);

