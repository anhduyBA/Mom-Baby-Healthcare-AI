import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { 
  createDailyMonitoring, 
  getDailyMonitoringHistory, 
  getTodayMonitoring,
  getHealthInsights
} from "../controllers/dailyMonitoringController.js";

const router = express.Router();

router.post("/create", authMiddleware, createDailyMonitoring);
router.get("/history", authMiddleware, getDailyMonitoringHistory);
router.get("/today", authMiddleware, getTodayMonitoring);
router.get("/insights", authMiddleware, getHealthInsights);

export default router;

