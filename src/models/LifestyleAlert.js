import mongoose from "mongoose";

const LifestyleAlertSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    monitoringId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "DailyMonitoring" 
    },
    ruleId: { 
      type: String, 
      required: true 
    },
    severity: { 
      type: String, 
      enum: ["HIGH", "MEDIUM", "POSITIVE"], 
      required: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    },
    suggestion: { 
      type: String, 
      required: true 
    },
    triggeredAt: { 
      type: Date, 
      default: Date.now 
    },
    status: { 
      type: String, 
      enum: ["pending", "resolved"], 
      default: "pending" 
    }
  },
  { timestamps: true }
);

export default mongoose.models.LifestyleAlert || mongoose.model("LifestyleAlert", LifestyleAlertSchema);
