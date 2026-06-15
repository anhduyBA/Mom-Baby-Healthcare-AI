import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  submitLifestyleEntry,
  getTodayEntry,
  getHistory,
  getAlerts,
  getSummary
} from "../controllers/lifestyleController.js";

const router = express.Router();

router.post("/entry", authMiddleware, submitLifestyleEntry);
router.get("/today", authMiddleware, getTodayEntry);
router.get("/history", authMiddleware, getHistory);
router.get("/alerts", authMiddleware, getAlerts);
router.get("/summary", authMiddleware, getSummary);

export default router;
