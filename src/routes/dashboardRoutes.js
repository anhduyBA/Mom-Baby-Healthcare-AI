console.log("Dashboard routes loaded!");

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getUserDashboard } from "../controllers/dashboardController.js";
import SymptomEntry from "../models/SymptomEntry.js";

const router = express.Router();

router.get("/", authMiddleware, getUserDashboard);

router.get("/symptoms", authMiddleware, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const userId = req.user._id;

    const symptoms = await SymptomEntry.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(symptoms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/alerts", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const alerts = await SymptomEntry.find({
      userId,
      alertFlag: true,
    }).sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
