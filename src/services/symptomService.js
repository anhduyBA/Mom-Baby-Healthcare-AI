import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { classifyStudentProfile } from "./profileClassifier.js";
import { buildSymptomPrompt } from "./symptomPromptBuilder.js";
import SymptomAnalysis from "../models/SymptomAnalysis.js";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import admin, { firebaseInitialized } from "../config/firebase.js";

let genAI = null;
let visionModel = null;
let textModel = null;

/**
 * Initializes Gemini clients dynamically to prevent ES module hoisting issues.
 */
function initAI() {
  const key = process.env.GEMINI_API_KEY || process.env.BIOMISTRAL_API_KEY;
  if (!key) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
    visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return { visionModel, textModel };
}

/**
 * Safely parses JSON response from the Gemini API.
 */
function parseAIResponse(text) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse Gemini response JSON:", err);
    return null;
  }
}

function mapUrgencyLevel(level) {
  if (!level) return "Thấp";
  const norm = level.toLowerCase().trim();
  if (norm.includes("khẩn") || norm.includes("emergency") || norm.includes("urgent")) return "Khẩn cấp";
  if (norm.includes("cao") || norm.includes("high")) return "Cao";
  if (norm.includes("trung") || norm.includes("moderate") || norm.includes("medium")) return "Trung bình";
  return "Thấp";
}

function mapProbability(prob) {
  if (!prob) return "Cần kiểm tra";
  const norm = prob.toLowerCase().trim();
  if (norm.includes("có thể") || norm.includes("possible") || norm.includes("likely")) return "Có thể";
  if (norm.includes("ít") || norm.includes("unlikely") || norm.includes("low")) return "Ít khả năng";
  return "Cần kiểm tra";
}

/**
 * Uploads an image buffer either to Firebase Storage or falls back to local uploads directory.
 * 
 * @param {Buffer} buffer - Image file buffer.
 * @param {string} mimeType - File mimetype (e.g. image/png).
 * @param {string} userId - User Mongoose ID.
 * @returns {Promise<string>} Public file URL or local path.
 */
async function uploadToStorage(buffer, mimeType, userId) {
  if (firebaseInitialized) {
    try {
      const bucket = admin.storage().bucket();
      const ext = mimeType.split("/")[1] || "jpg";
      const filename = `symptoms/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const file = bucket.file(filename);

      await file.save(buffer, {
        metadata: { contentType: mimeType },
        public: true
      });

      // Firebase Storage public URLs look like this
      return `https://storage.googleapis.com/${bucket.name}/${filename}`;
    } catch (err) {
      console.error("[Firebase Upload Error] Failed, falling back to local disk storage:", err.message);
    }
  }

  // Fallback: Local uploads storage
  const dir = path.join("uploads", "symptoms");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const ext = mimeType.split("/")[1] || "jpg";
  const filename = `${userId}-${Date.now()}.${ext}`;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  // Return the static route path
  return `/uploads/symptoms/${filename}`;
}

/**
 * Analyzes symptom description and optional image, mapping to student profile.
 * 
 * @param {string} userId - User Mongoose ID.
 * @param {Object} lifestyleData - Recent lifestyle entries for classification.
 * @param {string} textDescription - Text description of the symptom.
 * @param {Buffer} [imageBuffer] - Optional uploaded image buffer.
 * @param {string} [mimeType] - Mimetype of the uploaded image.
 * @returns {Promise<Object>} The classified profile and symptom analysis result.
 */
export async function analyzeSymptom(userId, lifestyleData, textDescription, imageBuffer, mimeType) {
  const startTime = Date.now();

  // 1. Classify maternal profile
  const { classifyMaternalProfile } = await import("./profileClassifier.js");
  const profile = lifestyleData ? classifyMaternalProfile(lifestyleData) : {
    profileId: "pre-natal",
    profileName: "Mom Khởi Đầu (Chuẩn bị mang thai)",
    nutritionNeeds: ["fertility-boosting", "folic-acid", "antioxidants", "healthy-weight", "easy-to-cook"]
  };

  // 2. Build prompt
  const prompt = buildSymptomPrompt(textDescription, profile);

  // 3. Build Gemini content parts
  const parts = [{ text: prompt }];
  if (imageBuffer) {
    parts.push({
      inlineData: {
        mimeType,
        data: imageBuffer.toString("base64")
      }
    });
  }

  // 4. Call Gemini API
  const apiInstances = initAI();
  if (!apiInstances) {
    throw new Error("Cấu hình API Key (GEMINI_API_KEY hoặc BIOMISTRAL_API_KEY) chưa được thiết lập.");
  }

  let model = imageBuffer ? apiInstances.visionModel : apiInstances.textModel;
  let modelName = "gemini-2.5-flash";
  let result;
  let rawText = "";

  try {
    console.log(`[AI] Running symptom analysis using ${modelName}...`);
    result = await model.generateContent({ contents: [{ role: "user", parts }] });
    rawText = result.response.text();
  } catch (err) {
    console.warn(`[AI] Model ${modelName} failed with image. Error: ${err.message}.`);
    if (imageBuffer) {
      console.log("[AI] Attempting text-only fallback with gemini-2.5-flash...");
      try {
        modelName = "gemini-2.5-flash (text-only fallback)";
        const textOnlyParts = [{ text: prompt }];
        result = await apiInstances.textModel.generateContent({ contents: [{ role: "user", parts: textOnlyParts }] });
        rawText = result.response.text();
      } catch (err2) {
        console.error("[AI] Text-only fallback also failed. Error:", err2.message);
        throw new Error(`Phân tích triệu chứng thất bại: ${err2.message}`);
      }
    } else {
      throw new Error(`Phân tích triệu chứng thất bại: ${err.message}`);
    }
  }

  const parsed = parseAIResponse(rawText);
  if (!parsed || !parsed.possibleConditions) {
    throw new Error("Không thể phân tích dữ liệu triệu chứng trả về từ trí tuệ nhân tạo.");
  }

  // 5. Upload image if present
  let imageUrl = "";
  if (imageBuffer && mimeType) {
    imageUrl = await uploadToStorage(imageBuffer, mimeType, userId);
  }

  const processingTime = Date.now() - startTime;
  const mappedUrgency = mapUrgencyLevel(parsed.urgencyLevel);
  const isUrgent = mappedUrgency === "Khẩn cấp";

  // 6. Handle Emergency: trigger email alert to mother
  if (isUrgent) {
    try {
      const user = await User.findById(userId);
      if (user && user.email) {
        const subject = "[CẢNH BÁO NGUY HIỂM] Khuyến cáo khẩn cấp từ Mom Ơi!";
        const emailContent = `
Xin chào ${user.name || "bạn"},

Hệ thống trợ lý y tế Mom Ơi! vừa ghi nhận báo cáo triệu chứng của bạn:
"${textDescription}"

MỨC ĐỘ NGUY HIỂM ĐƯỢC ĐÁNH GIÁ LÀ: KHẨN CẤP.

Lý do: ${parsed.urgencyReason || "Triệu chứng có dấu hiệu nghiêm trọng cần được can thiệp y tế ngay."}

Hành động khuyến cáo ngay lập tức:
${(parsed.recommendations || []).map(r => `- ${r}`).join("\n")}

Vui lòng liên hệ ngay với đường dây nóng y tế khẩn cấp 115 hoặc di chuyển đến bệnh viện/trạm y tế phụ sản gần nhất!

Trân trọng,
Đội ngũ phát triển Mom Ơi!
        `.trim();

        sendEmail(user.email, subject, emailContent).catch(mailErr => {
          console.error("[Email Error] Failed to send emergency alert email:", mailErr.message);
        });
      }
    } catch (dbErr) {
      console.error("[DB Error] Failed to fetch user email for emergency alert:", dbErr.message);
    }
  }

  // 7. Save to MongoDB
  const analysisDoc = new SymptomAnalysis({
    userId,
    profileId: profile.profileId,
    textDescription,
    imageUrl,
    imageMimeType: mimeType || "",
    analysisResult: {
      possibleConditions: parsed.possibleConditions.map(c => ({
        name: c.name || "Không rõ",
        probability: mapProbability(c.probability),
        description: c.description || ""
      })),
      lifestyleConnection: parsed.lifestyleConnection || "",
      urgencyLevel: mappedUrgency,
      urgencyReason: parsed.urgencyReason || "",
      recommendations: parsed.recommendations || [],
      dietarySuggestions: parsed.dietarySuggestions || [],
      disclaimer: parsed.disclaimer || "Đây chỉ là phân tích sơ bộ y tế cho mẹ và bé.",
      shouldSeeDoctor: parsed.shouldSeeDoctor ?? true,
      specialistType: parsed.specialistType || "Bác sĩ tổng quát"
    },
    processingTime,
    geminiModel: modelName,
    isAdminReviewRequired: isUrgent
  });

  await analysisDoc.save();

  return {
    profile,
    analysis: analysisDoc
  };
}

/**
 * Retrieves the symptom analysis history for a specific student.
 * 
 * @param {string} userId - User Mongoose ID.
 * @param {number} [limit=10] - Maximum number of records to retrieve.
 * @returns {Promise<Array>} List of past analyses.
 */
export async function getSymptomHistory(userId, limit = 10) {
  return SymptomAnalysis.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
}
