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
  },

  // Maternal health metrics
  steps: {
    type: Number,
    default: 0
  },
  babyIronInput: {
    type: Number,
    default: 0
  },
  babyFoodTexture: {
    type: String,
    default: ""
  },
  babyFishServings: {
    type: Number,
    default: 0
  },
  epdsScore: {
    type: Number,
    default: 0
  },
  conceptionDayOfCycle: {
    type: Number,
    default: 0
  },
  allergySymptomLogged: {
    type: Boolean,
    default: false
  },
  newFoodLogged: {
    type: String,
    default: ""
  }

}, { timestamps: true });

export default mongoose.model("DailyMonitoring", DailyMonitoringSchema);
