import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PROMPTS } from "./src/config/market.vn.js";

dotenv.config();

const run = async () => {
  const key = process.env.BIOMISTRAL_API_KEY;
  console.log("API Key present:", !!key);
  if (!key) return;

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const userContext = `
**User Health Context (from recent monitoring):**
- Student Lifestyle Profile: Balanced
- Health Summary: Normal
`;
  const userMessage = "đề xuất bài tập dựa trên tình trạng của tôi";
  const systemPrompt = PROMPTS.chatSystem(userContext, userMessage);

  try {
    console.log("Calling Gemini API...");
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text();
    console.log("AI Text Response:", text);
    
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("Cleaned Text:", cleanedText);
    
    let aiData;
    try {
      aiData = JSON.parse(cleanedText);
      console.log("Successfully parsed JSON:", aiData);
    } catch (e) {
      console.log("JSON Parse Failed, falling back to raw text. Error:", e.message);
      aiData = { reply: text, dietPlan: null };
    }
  } catch (err) {
    console.error("Gemini call crashed:", err);
  }
};

run();
