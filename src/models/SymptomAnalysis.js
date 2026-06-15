import mongoose from "mongoose";

const PossibleConditionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  probability: { type: String, enum: ["Có thể", "Ít khả năng", "Cần kiểm tra"], required: true },
  description: { type: String, required: true }
}, { _id: false });

const AnalysisResultSchema = new mongoose.Schema({
  possibleConditions: [PossibleConditionSchema],
  lifestyleConnection: { type: String, required: true },
  urgencyLevel: { type: String, enum: ["Thấp", "Trung bình", "Cao", "Khẩn cấp"], required: true },
  urgencyReason: { type: String, required: true },
  recommendations: [{ type: String }],
  dietarySuggestions: [{ type: String }],
  disclaimer: { type: String, required: true },
  shouldSeeDoctor: { type: Boolean, required: true },
  specialistType: { type: String, default: "" }
}, { _id: false });

const SymptomAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    profileId: {
      type: String,
      required: true
    },
    textDescription: {
      type: String,
      required: true,
      maxlength: 1000
    },
    imageUrl: {
      type: String,
      default: ""
    },
    imageMimeType: {
      type: String,
      enum: ["image/jpeg", "image/png", "image/webp", "image/avif", ""],
      default: ""
    },
    analysisResult: AnalysisResultSchema,
    processingTime: {
      type: Number,
      required: true
    },
    geminiModel: {
      type: String,
      default: "gemini-1.5-pro"
    },
    isAdminReviewRequired: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.models.SymptomAnalysis || mongoose.model("SymptomAnalysis", SymptomAnalysisSchema);
