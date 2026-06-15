import mongoose from "mongoose";

const RuleThresholdSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      required: true,
      unique: true
    },
    thresholds: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.RuleThreshold || mongoose.model("RuleThreshold", RuleThresholdSchema);
