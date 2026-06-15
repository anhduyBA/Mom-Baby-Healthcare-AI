import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema({
  ruleId: { type: String, required: true },
  severity: { type: String, enum: ["HIGH", "MEDIUM", "POSITIVE"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  suggestion: { type: String, required: true },
  triggeredAt: { type: Date, default: Date.now }
});

const LifestyleEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      }
    },
    studyHours: { type: Number, default: 0 },
    sleepHours: { type: Number, default: 0 },
    physicalHours: { type: Number, default: 0 },
    socialHours: { type: Number, default: 0 },
    extracurricularHours: { type: Number, default: 0 },
    gpa: { type: Number, default: 0 },
    stressLevel: {
      type: String,
      enum: ["Low", "Moderate", "High"],
      default: "Low"
    },
    alerts: [AlertSchema],
    healthScore: { type: Number, min: 0, max: 100, required: true },
    lifestyleProfile: {
      type: String,
      enum: ["Burned Out", "Couch Scholar", "Balanced", "Overachiever", "Unknown"],
      default: "Unknown"
    }
  },
  { timestamps: true }
);

// Ensure only one entry per student per day
LifestyleEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.LifestyleEntry || mongoose.model("LifestyleEntry", LifestyleEntrySchema);
