import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  getStudentsRisk,
  getReportsSummary,
  updateRuleThresholds
} from "../controllers/adminController.js";

const router = express.Router();

// Apply auth and admin protections to all admin endpoints
router.get("/students/risk", authMiddleware, adminMiddleware, getStudentsRisk);
router.get("/reports/summary", authMiddleware, adminMiddleware, getReportsSummary);
router.post("/rules/thresholds", authMiddleware, adminMiddleware, updateRuleThresholds);

export default router;
