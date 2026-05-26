import express from "express";
import { 
  generateDietPlan, 
  getDietPlan, 
  updateDietPlan, 
  getRecipe 
} from "../controllers/dietController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { generateAIDiet } from "../controllers/aiDietController.js";
import { generateAIRecipes } from "../controllers/aiController.js";
const router = express.Router();

router.post("/generate", authMiddleware, generateDietPlan);
router.get("/", authMiddleware, getDietPlan);
router.put("/:id", authMiddleware, updateDietPlan);
router.get("/recipe", authMiddleware, getRecipe);
router.post("/ai", authMiddleware, generateAIRecipes);
router.post("/ai-generate", authMiddleware, generateAIDiet);

export default router;
