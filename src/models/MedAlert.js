import mongoose from "mongoose";

const MedAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  medName: String,
  date: Date,
  status: { type: String, enum: ["sent", "clicked"], default: "sent" },
  channel: String,
}, { timestamps: true });

export default mongoose.models.MedAlert || mongoose.model("MedAlert", MedAlertSchema);
