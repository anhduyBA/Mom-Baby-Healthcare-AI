import mongoose from "mongoose";

const UserHealthProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  age: {
    type: Number,
    required: true,
    default: 25
  },
  gender: {
    type: String,
    required: true,
    default: "female"
  },
  height: {
    type: Number,
    required: true,
    default: 160
  },
  weight: {
    type: Number,
    required: true,
    default: 50
  },
  diseaseTags: {
    type: [String],
    default: []
  },
  dietType: {
    type: String,
    required: true,
    default: "regular"
  },
  pregnancyStage: {
    type: String,
    enum: ["pre-natal", "pregnant", "post-natal"],
    default: "pre-natal",
  },
  pregnancyWeek: {
    type: Number,
    default: 0,
  },
  babyBirthDate: {
    type: Date,
    default: null,
  },
  aiContext: {
    lastUpdated: Date,
    healthSummary: String,
    recommendations: [String],
    concerns: [String],
    trends: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

export default mongoose.models.UserHealthProfile || mongoose.model("UserHealthProfile", UserHealthProfileSchema);
