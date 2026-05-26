import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["user", "bot"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messages: { type: [messageSchema], default: [] },
    sessionId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.ChatHistory || mongoose.model("ChatHistory", chatHistorySchema);
