import express from "express";
import rateLimit from "express-rate-limit";
import {
  addSymptomEntry,
  getSymptomEntriesByUser,
  getSymptomEntryById
} from "../controllers/symptomController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadImage } from "../middleware/uploadMiddleware.js";
import { analyzeSymptom, getSymptomHistory } from "../services/symptomService.js";
import SymptomAnalysis from "../models/SymptomAnalysis.js";
import LifestyleEntry from "../models/LifestyleEntry.js";

const router = express.Router();

// Apply auth middleware to all endpoints
router.use(authMiddleware);

// Rate limiting: max 5 symptom analyses per hour per user
const symptomAnalyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    data: null,
    message: "Bạn đã đạt giới hạn phân tích triệu chứng (tối đa 5 lần mỗi giờ). Vui lòng thử lại sau.",
    error: "Too Many Requests"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  validate: { default: false }
});

// Multer error handling wrapper for Express
const handleMulterUpload = (req, res, next) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message || "Lỗi tải ảnh lên.",
        error: "Multer Error"
      });
    }
    next();
  });
};

/**
 * POST /api/symptoms/analyze
 * Mulitmodal symptom analyzer via Gemini Vision API
 */
router.post("/analyze", symptomAnalyzeLimiter, handleMulterUpload, async (req, res) => {
  try {
    const { textDescription } = req.body;

    if (!textDescription || typeof textDescription !== "string" || textDescription.trim().length < 10 || textDescription.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Mô tả triệu chứng phải từ 10 đến 1000 ký tự.",
        error: "Validation Error"
      });
    }

    const result = await analyzeSymptom(
      req.user._id,
      req.healthProfile,
      textDescription.trim(),
      req.file ? req.file.buffer : null,
      req.file ? req.file.mimetype : null
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: "Phân tích triệu chứng thành công."
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      message: err.message || "Đã xảy ra lỗi trong quá trình phân tích triệu chứng.",
      error: "Internal Server Error"
    });
  }
});

/**
 * GET /api/symptoms/history
 * Returns the past symptom analysis history for current user
 */
router.get("/history", async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const history = await getSymptomHistory(req.user._id, limit);
    return res.status(200).json({
      success: true,
      data: history,
      message: "Tải lịch sử phân tích thành công."
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      data: null,
      message: "Không thể tải lịch sử phân tích.",
      error: err.message
    });
  }
});

/**
 * GET /api/symptoms/:analysisId
 * Fetch single analysis details (with fallback compatibility to legacy symptom entries)
 */
router.get("/:analysisId", async (req, res, next) => {
  try {
    const { analysisId } = req.params;

    // Check if it exists in SymptomAnalysis collection first
    const analysis = await SymptomAnalysis.findOne({ _id: analysisId, userId: req.user._id });
    if (analysis) {
      return res.status(200).json({
        success: true,
        data: analysis,
        message: "Lấy chi tiết phân tích triệu chứng thành công."
      });
    }

    // Fallback: Proceed to legacy getSymptomEntryById
    return next();
  } catch (err) {
    // If it's a cast error or other error, fallback to legacy getSymptomEntryById
    return next();
  }
});

// === LEGACY ROUTES FOR COMPATIBILITY ===
// (Placed at the end to prevent router conflicts)
router.get("/", getSymptomEntriesByUser);
router.get("/:id", getSymptomEntryById);
// Note: We use a custom raw multer configuration for the legacy endpoint
// so as not to break existing multi-image upload clients
import multerLegacy from "multer";
const legacyUpload = multerLegacy({ dest: "uploads/" });
router.post("/", legacyUpload.array("images", 5), addSymptomEntry);

export default router;