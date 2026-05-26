import express from "express";
import { sendMessage, getChatHistory } from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import rateLimit from "express-rate-limit";


const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  message: { message: "Too many messages, please wait a moment." },
});

router.post("/send", authMiddleware, chatLimiter, sendMessage);

router.get("/history", authMiddleware, getChatHistory);

export default router;
