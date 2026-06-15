import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeSymptom } from "../services/symptomService.js";
import mongoose from "mongoose";

dotenv.config({ path: "../LifeBalance_AI_BE/.env" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifebalance";

async function run() {
  console.log("Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB!");

  const testUserId = new mongoose.Types.ObjectId();
  const textDescription = "Tôi bị đau đầu dữ dội và chóng mặt sau khi học bài liên tục 10 tiếng";

  try {
    console.log("Analyzing symptom...");
    const result = await analyzeSymptom(testUserId, null, textDescription, null, null);
    console.log("Result success!:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error during symptom analysis:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
