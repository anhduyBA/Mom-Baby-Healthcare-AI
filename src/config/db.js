import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();




const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`🔥 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.log("⚠️ Continuing startup without exiting to allow reconnection attempts.");
  }
}

export default connectDB;