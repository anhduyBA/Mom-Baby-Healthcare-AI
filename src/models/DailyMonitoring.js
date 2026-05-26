import mongoose from "mongoose";

const DailyMonitoringSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },

  date: { 
    type: Date, 
    required: true 
  },

  sleep: {
    hours: Number,
    quality: Number
  },

  water: {
    liters: Number
  },

  meals: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean
  },

  mood: {
    score: Number,
    note: String
  },

  vitals: {
    sugar: Number,
    bpHigh: Number,
    bpLow: Number,
    weight: Number
  },

  symptoms: {
    severity: Number,
    note: String
  }

}, { timestamps: true });

export default mongoose.model("DailyMonitoring", DailyMonitoringSchema);
