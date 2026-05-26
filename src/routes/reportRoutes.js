import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserReportData } from "../controllers/reportController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserReportData);

export default router;
