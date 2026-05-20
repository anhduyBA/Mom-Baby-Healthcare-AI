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
  age: {
    type: Number,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  diseaseTags: {
    type: [String],
    default: []
  },
  dietType:{
    type: String,
    default: "Regular"
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
  },
  aiContext: {
    lastUpdated: Date,
    healthSummary: String,
    recommendations: [String],
    concerns: [String],
    trends: mongoose.Schema.Types.Mixed
  }

}, { timestamps: true });



export default mongoose.model("User", UserSchema);

