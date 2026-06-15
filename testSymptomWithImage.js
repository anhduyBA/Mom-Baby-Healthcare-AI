import dotenv from "dotenv";
import fs from "fs";
import { analyzeSymptom } from "./src/services/symptomService.js";
import mongoose from "mongoose";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lifebalance";

async function run() {
  console.log("Connecting to MongoDB:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  const testUserId = new mongoose.Types.ObjectId("6a1520696b427eb159caad99");
  const textDescription = "Tôi bị phát ban ngứa ngáy khắp người như hình";

  const imgPath = "./uploads/symptoms/6a1520696b427eb159caad99-1779786121268.webp";
  const imageBuffer = fs.readFileSync(imgPath);
  const mimeType = "image/webp";

  try {
    console.log("Analyzing symptom with image...");
    const result = await analyzeSymptom(testUserId, null, textDescription, imageBuffer, mimeType);
    console.log("Success!:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error during symptom analysis:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
