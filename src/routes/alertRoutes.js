import express from "express";
import { createAlertManual, getUserAlerts, updateAlertStatus } from "../controllers/alertController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserAlerts);
router.post("/", authMiddleware, createAlertManual);
router.put("/:id/status", authMiddleware, updateAlertStatus);

export default router;
