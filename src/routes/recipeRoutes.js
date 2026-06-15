import express from "express";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware.js";
import LifestyleEntry from "../models/LifestyleEntry.js";
import Recipe from "../models/Recipe.js";
import { classifyStudentProfile } from "../services/profileClassifier.js";
import {
  generateRecipesForStudent,
  getSavedRecipes,
  toggleSaveRecipe
} from "../services/recipeService.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Rate limiter: max 10 recipe generations per hour per user
const recipeGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    data: null,
    message: "Bạn đã đạt giới hạn tạo thực đơn (tối đa 10 lần mỗi giờ). Vui lòng thử lại sau.",
    error: "Too Many Requests"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  validate: { default: false }
});

/**
 * Helper to structure responses with the Unified API Response Format
 */
function sendUnifiedResponse(res, statusCode, success, data, message, error = null) {
  return res.status(statusCode).json({
    success,
    data,
    message,
    error
  });
}

/**
 * POST /api/recipes/generate
 * Generates personalized recipes based on latest lifestyle profile
 */
router.post("/generate", recipeGenerateLimiter, async (req, res) => {
  try {
    const userId = req.user._id;
    const { dietType, allergies, maxCookTime, availableIngredients } = req.body;

    // Input validations
    if (maxCookTime !== undefined) {
      const cookTimeNum = Number(maxCookTime);
      if (isNaN(cookTimeNum) || cookTimeNum < 10 || cookTimeNum > 120) {
        return sendUnifiedResponse(
          res,
          400,
          false,
          null,
          "Thời gian nấu tối đa phải là số từ 10 đến 120 phút.",
          "Validation Error"
        );
      }
    }

    if (allergies !== undefined && typeof allergies === "string" && allergies.length > 200) {
      return sendUnifiedResponse(
        res,
        400,
        false,
        null,
        "Thông tin dị ứng không được vượt quá 200 ký tự.",
        "Validation Error"
      );
    }

    // Run recipe generator (which handles classification, cache, and 6h cooldown)
    const result = await generateRecipesForStudent(
      userId,
      req.healthProfile,
      { dietType, allergies, maxCookTime, availableIngredients }
    );

    return sendUnifiedResponse(
      res,
      200,
      true,
      result,
      "Tạo thực đơn dinh dưỡng thành công."
    );
  } catch (err) {
    const isCooldownError = err.message.includes("thời gian chờ");
    const status = isCooldownError ? 429 : 503;
    return sendUnifiedResponse(
      res,
      status,
      false,
      null,
      err.message || "Không thể tạo thực đơn do sự cố dịch vụ AI.",
      err.stack || "Internal Server Error"
    );
  }
});

/**
 * GET /api/recipes/my
 * Returns saved or cached recipes for current user with optional filters & pagination
 */
router.get("/my", async (req, res) => {
  try {
    const userId = req.user._id;
    const { page, limit, profileId, tags, difficulty, isSaved } = req.query;

    const result = await getSavedRecipes(userId, {
      page,
      limit,
      profileId,
      tags,
      difficulty,
      isSaved
    });

    return sendUnifiedResponse(
      res,
      200,
      true,
      result,
      "Tải danh sách thực đơn thành công."
    );
  } catch (err) {
    return sendUnifiedResponse(
      res,
      500,
      false,
      null,
      "Không thể tải danh sách thực đơn.",
      err.message
    );
  }
});

/**
 * GET /api/recipes/:recipeId
 * Fetch single recipe details
 */
router.get("/:recipeId", async (req, res) => {
  try {
    const userId = req.user._id;
    const { recipeId } = req.params;

    const recipe = await Recipe.findOne({ _id: recipeId, userId });
    if (!recipe) {
      return sendUnifiedResponse(
        res,
        404,
        false,
        null,
        "Không tìm thấy công thức nấu ăn này.",
        "Not Found"
      );
    }

    return sendUnifiedResponse(
      res,
      200,
      true,
      recipe,
      "Lấy thông tin chi tiết món ăn thành công."
    );
  } catch (err) {
    return sendUnifiedResponse(
      res,
      500,
      false,
      null,
      "Lỗi hệ thống khi tải thông tin món ăn.",
      err.message
    );
  }
});

/**
 * PATCH /api/recipes/:recipeId/save
 * Toggle bookmark/save status of a recipe
 */
router.patch("/:recipeId/save", async (req, res) => {
  try {
    const userId = req.user._id;
    const { recipeId } = req.params;

    const updatedRecipe = await toggleSaveRecipe(userId, recipeId);
    
    return sendUnifiedResponse(
      res,
      200,
      true,
      { isSaved: updatedRecipe.isSaved },
      updatedRecipe.isSaved ? "Đã lưu món ăn vào sổ tay." : "Đã hủy lưu món ăn khỏi sổ tay."
    );
  } catch (err) {
    return sendUnifiedResponse(
      res,
      500,
      false,
      null,
      err.message || "Không thể thay đổi trạng thái lưu món ăn.",
      err.message
    );
  }
});

/**
 * GET /api/recipes/profiles/current
 * Fetch current student profile classification details
 */
router.get("/profiles/current", async (req, res) => {
  try {
    const { classifyMaternalProfile } = await import("../services/profileClassifier.js");
    const profile = classifyMaternalProfile(req.healthProfile);

    // Provide descriptions for each maternity stage profile
    let description = "";
    if (profile.profileId === "pre-natal") {
      description = "Bạn đang ở giai đoạn chuẩn bị mang thai. Cơ thể bạn cần các dưỡng chất hỗ trợ thụ thai, giàu axit folic, chất chống oxy hóa và duy trì cân nặng lành mạnh.";
    } else if (profile.profileId === "pregnant") {
      description = "Bạn đang trong thai kỳ. Việc bổ sung sắt, canxi, chất xơ và ăn các thực phẩm an toàn cho thai nhi là cực kỳ quan trọng để bé phát triển khỏe mạnh.";
    } else if (profile.profileId === "post-natal") {
      description = "Bạn đã sinh em bé (giai đoạn 0-24 tháng). Thực đơn tập trung vào hồi phục sau sinh, lợi sữa, tăng cường omega-3 và các món ăn dễ tiêu hóa.";
    }

    return sendUnifiedResponse(
      res,
      200,
      true,
      {
        ...profile,
        description
      },
      "Tải thông tin hồ sơ dinh dưỡng hiện tại thành công."
    );
  } catch (err) {
    return sendUnifiedResponse(
      res,
      500,
      false,
      null,
      "Không thể tải thông tin hồ sơ dinh dưỡng.",
      err.message
    );
  }
});

export default router;
