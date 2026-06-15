import ChatHistory from "../models/ChatHistory.js";
import DietPlan from "../models/DietPlan.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { PROMPTS } from "../config/market.vn.js";

dotenv.config();

const bioMistralClient = new GoogleGenerativeAI(process.env.BIOMISTRAL_API_KEY);

export const sendMessage = async (req, res) => {
  const userMessage = req.body.text;
  const sessionId = req.body.sessionId || null;
  const userId = req.user._id;

  if (!process.env.BIOMISTRAL_API_KEY) {
    const mockReply = "I'm here to help! (Mock response – set BIOMISTRAL_API_KEY in .env)";
    let chat = await ChatHistory.findOne({ userId, sessionId });
    if (!chat) chat = new ChatHistory({ userId, sessionId, messages: [] });
    chat.messages.push({ sender: "user", text: userMessage }, { sender: "bot", text: mockReply });
    await chat.save();
    return res.json({ reply: mockReply });
  }

  try {
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    
    let userContext = "";
    if (user) {
      userContext = `
**User Health Context (from recent monitoring):**
- Student Lifestyle Profile: ${user.lifestyleProfile || 'Balanced'} (derived from comparison with student dataset)
- Health Summary: ${user.aiContext?.healthSummary || 'N/A'}
- Active Recommendations: ${user.aiContext?.recommendations?.join('; ') || 'None'}
- Health Concerns: ${user.aiContext?.concerns?.join('; ') || 'None'}
- Last Updated: ${user.aiContext?.lastUpdated ? new Date(user.aiContext.lastUpdated).toLocaleDateString() : 'N/A'}

**User Profile:**
- Age: ${user.age || 'N/A'}
- Gender: ${user.gender || 'N/A'}
- Disease Tags: ${user.diseaseTags?.join(', ') || 'None'}
- Diet Type: ${user.dietType || 'Regular'}
- User Type: ${user.userType || 'student'}
- University: ${user.university || 'N/A'}
`;
    }

    const systemPrompt = PROMPTS.chatSystem(userContext, userMessage);
    let text = "";
    let modelName = "gemini-2.5-flash";

    try {
      const model = bioMistralClient.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(systemPrompt);
      text = result.response.text();
    } catch (err) {
      console.warn(`[Chat] Model ${modelName} failed. Error: ${err.message}. Trying gemini-2.0-flash...`);
      try {
        modelName = "gemini-2.0-flash";
        const fallbackModel = bioMistralClient.getGenerativeModel({ model: modelName });
        const result = await fallbackModel.generateContent(systemPrompt);
        text = result.response.text();
      } catch (err2) {
        console.error("[Chat] All models failed.", err2);
        throw err2;
      }
    }

    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let aiData;
    try {
      aiData = JSON.parse(cleanedText);
    } catch {
      aiData = { reply: text, dietPlan: null };
    }

    const botReply = aiData.reply || "I'm here to help with your health.";

    let chat = await ChatHistory.findOne({ userId, sessionId });
    if (!chat) chat = new ChatHistory({ userId, sessionId, messages: [] });
    chat.messages.push({ sender: "user", text: userMessage }, { sender: "bot", text: botReply });
    await chat.save();

    if (aiData.dietPlan?.dailyMeals) {
      await DietPlan.findOneAndUpdate(
        { userId },
        { userId, dailyMeals: aiData.dietPlan.dailyMeals, weekNumber: 1 },
        { upsert: true, new: true }
      );
    }

    res.json({ reply: botReply });
  } catch (err) {
    console.error("Error in sendMessage:", err);
    let fallbackReply = "I'm here to help, but I couldn't process your request right now. Please try again later.";
    if (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota") || err.message?.includes("Quota")) {
      fallbackReply = "Hệ thống AI hiện tại đang quá tải hoặc đạt giới hạn lượt yêu cầu của gói miễn phí. Xin vui lòng thử lại sau ít phút.";
    }
    let chat = await ChatHistory.findOne({ userId, sessionId });
    if (!chat) chat = new ChatHistory({ userId, sessionId, messages: [] });
    chat.messages.push({ sender: "user", text: userMessage }, { sender: "bot", text: fallbackReply });
    await chat.save();
    res.json({ reply: fallbackReply });
  }
};

export const getChatHistory = async (req, res) => {
  const userId = req.user._id;
  const sessionId = req.query.sessionId || null;
  const limit = Number(req.query.limit) || 50;

  try {
    const chat = await ChatHistory.findOne({ userId, sessionId });
    if (!chat) return res.json({ messages: [] });
    res.json({ messages: chat.messages.slice(-limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching chat history" });
  }
};
