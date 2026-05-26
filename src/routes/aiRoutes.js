import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { generateAIRecipes } from "../controllers/aiController.js";
import { generateAIDiet } from "../controllers/aiDietController.js";

const router = express.Router();

router.post("/generate", authMiddleware, generateAIRecipes);
router.post("/diet-generate", authMiddleware, generateAIDiet);

export default router;
