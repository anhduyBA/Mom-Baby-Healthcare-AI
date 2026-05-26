import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["symptom", "medication", "routineCheck"], required: true },
    severity: { type: Number, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["pending", "sent", "resolved"], default: "pending" },
    channels: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Alert || mongoose.model("Alert", AlertSchema);
