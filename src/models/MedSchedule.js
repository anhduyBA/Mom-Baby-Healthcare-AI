import mongoose from "mongoose";

const adherenceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  status: { type: String, enum: ["taken", "skipped"], required: true },
});

const medScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    medName: { 
        type: String, 
        required: true 
    },
    dosage: { 
        type: String, 
        required: true 
    }, 

    times: [{ type: String, required: true }], 

    startDate: { 
        type: Date, 
        required: true 
    },
    endDate: { 
        type: Date, 
        required: true 
    },
    adherenceLog: [adherenceSchema],
    notes: { 
        type: String 
    },
  },
  { timestamps: true } 
);

export default mongoose.model("MedSchedule", medScheduleSchema);
