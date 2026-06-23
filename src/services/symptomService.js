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
 * Local rule-based symptom analysis engine when Gemini API is unavailable or rate-limited.
 */
function getLocalSymptomFallback(textDescription, profile) {
  const desc = textDescription.toLowerCase();
  
  const isAllergy = desc.includes("dị ứng") || desc.includes("di ung") || 
                    desc.includes("ngứa") || desc.includes("ngua") || 
                    desc.includes("phát ban") || desc.includes("phat ban") || 
                    desc.includes("nổi mẩn") || desc.includes("noi man") || 
                    desc.includes("mề đay") || desc.includes("me day") || 
                    desc.includes("mụn") || desc.includes("mun");

  const isAbdominalPain = desc.includes("đau bụng") || desc.includes("dau bung") || 
                          desc.includes("co thắt") || desc.includes("co that") || 
                          desc.includes("đau hông") || desc.includes("dau hong") || 
                          desc.includes("cramping");

  const isBleeding = desc.includes("máu") || desc.includes("mau") || 
                     desc.includes("chảy máu") || desc.includes("chay mau") || 
                     desc.includes("ra dịch hồng") || desc.includes("ra dich hong") || 
                     desc.includes("bleeding");

  if (isAllergy) {
    return {
      possibleConditions: [
        {
          name: "Phát ban thai kỳ / Dị ứng thực phẩm",
          probability: "Có thể",
          description: "Phản ứng kích ứng da thường gặp khi tiếp xúc dị nguyên (như gluten trong bánh mì, phấn hoa, mỹ phẩm) hoặc do thay đổi nội tiết tố thai kỳ (PUPPP)."
        }
      ],
      lifestyleConnection: "Có liên quan đến việc tiêu thụ thực phẩm mới hoặc thay đổi nội tiết tố đột ngột trong thai kỳ của bạn.",
      urgencyLevel: "Trung bình",
      urgencyReason: "Triệu chứng gây ngứa ngáy, khó chịu nhưng không đe dọa tính mạng ngay lập tức nếu không đi kèm khó thở.",
      recommendations: [
        "Ngưng sử dụng thực phẩm hoặc sản phẩm nghi ngờ gây dị ứng ngay lập tức.",
        "Tránh cào gãi vết ngứa để ngăn ngừa trầy xước và nhiễm trùng cơ hội.",
        "Chườm mát hoặc sử dụng các loại sữa tắm dịu nhẹ dành riêng cho phụ nữ mang thai."
      ],
      dietarySuggestions: [
        "Uống nhiều nước ấm để hỗ trợ cơ thể đào thải dị nguyên.",
        "Tránh các món ăn dễ gây dị ứng khác như hải sản, các loại hạt, đồ ăn quá cay nóng.",
        "Bổ sung thực phẩm thanh mát và giàu Vitamin C để tăng cường đề kháng tự nhiên."
      ],
      disclaimer: "Kết quả phân tích này mang tính chất tham khảo sơ bộ từ công cụ chẩn đoán cục bộ.",
      shouldSeeDoctor: true,
      specialistType: "Bác sĩ Da liễu / Sản phụ khoa"
    };
  }

  if (isAbdominalPain) {
    return {
      possibleConditions: [
        {
          name: "Căng dây chằng tròn / Co thắt tử cung sinh lý",
          probability: "Cần kiểm tra",
          description: "Sự phát triển của thai nhi làm căng cơ tử cung, hoặc dấu hiệu co thắt nhẹ do vận động quá sức."
        }
      ],
      lifestyleConnection: "Có thể do hoạt động đi lại nhiều, làm việc nặng hoặc uống không đủ nước trong ngày.",
      urgencyLevel: "Trung bình",
      urgencyReason: "Đau bụng lâm râm nhẹ là bình thường, nhưng nếu đau thắt dữ dội hoặc đi kèm chảy máu thì cực kỳ nguy hiểm.",
      recommendations: [
        "Nằm nghỉ ngơi nghiêng sang bên trái trong không gian thoáng mát.",
        "Uống một ly nước ấm và hít thở sâu, nhẹ nhàng.",
        "Theo dõi tần suất và mức độ của các cơn đau."
      ],
      dietarySuggestions: [
        "Tránh các thực phẩm gây đầy hơi, khó tiêu như đồ chiên rán, đồ uống có ga.",
        "Bổ sung các món ăn lỏng, ấm, dễ tiêu hóa như cháo, súp củ quả."
      ],
      disclaimer: "Kết quả phân tích này mang tính chất tham khảo sơ bộ từ công cụ chẩn đoán cục bộ.",
      shouldSeeDoctor: true,
      specialistType: "Bác sĩ Sản phụ khoa"
    };
  }

  if (isBleeding) {
    return {
      possibleConditions: [
        {
          name: "Chảy máu âm đạo bất thường thai kỳ",
          probability: "Có thể",
          description: "Có thể do xuất huyết bám tổ, thay đổi nội tiết tố hoặc các tình trạng cần được chăm sóc y tế khẩn cấp."
        }
      ],
      lifestyleConnection: "Đòi hỏi hạn chế tối đa vận động mạnh và tránh căng thẳng tâm lý.",
      urgencyLevel: "Khẩn cấp",
      urgencyReason: "Ra máu âm đạo trong thai kỳ luôn là một dấu hiệu cảnh báo cần được kiểm tra y tế ngay lập tức.",
      recommendations: [
        "Nằm yên tại giường, hạn chế di chuyển tối đa.",
        "Dùng băng vệ sinh để theo dõi lượng và màu sắc máu chảy ra.",
        "Đến ngay cơ sở y tế phụ sản gần nhất để kiểm tra tim thai và tử cung."
      ],
      dietarySuggestions: [
        "Tránh ăn uống các thực phẩm lạnh hoặc có tính hàn.",
        "Uống nước ấm và nghỉ ngơi hoàn toàn."
      ],
      disclaimer: "Kết quả phân tích này mang tính chất tham khảo sơ bộ từ công cụ chẩn đoán cục bộ.",
      shouldSeeDoctor: true,
      specialistType: "Bác sĩ Sản phụ khoa cấp cứu"
    };
  }

  // Default fallback for general symptoms
  return {
    possibleConditions: [
      {
        name: "Rối loạn sinh lý thai kỳ thông thường / Thay đổi nội tiết tố",
        probability: "Cần kiểm tra",
        description: "Các thay đổi sinh lý tự nhiên khi mang thai gây ra các biểu hiện mệt mỏi, uể oải hoặc khó chịu nhẹ."
      }
    ],
    lifestyleConnection: "Liên quan đến nhịp sinh hoạt, chất lượng giấc ngủ và chế độ dinh dưỡng hàng ngày của mẹ.",
    urgencyLevel: "Thấp",
    urgencyReason: "Triệu chứng nhẹ, phổ biến ở phụ nữ mang thai và không đi kèm dấu hiệu nguy hiểm cấp tính.",
    recommendations: [
      "Dành thời gian nghỉ ngơi nhiều hơn, ngủ đủ giấc từ 7-8 tiếng mỗi ngày.",
      "Uống đủ 2-2.5 lít nước mỗi ngày để hỗ trợ tuần hoàn.",
      "Thực hiện các bài tập yoga bầu hoặc đi bộ nhẹ nhàng."
    ],
    dietarySuggestions: [
      "Ăn chín uống sôi hoàn toàn.",
      "Bổ sung đa dạng các nhóm chất dinh dưỡng và vitamin khoáng chất thai kỳ."
    ],
    disclaimer: "Kết quả phân tích này mang tính chất tham khảo sơ bộ từ công cụ chẩn đoán cục bộ.",
    shouldSeeDoctor: false,
    specialistType: "Bác sĩ Chăm sóc sức khỏe ban đầu"
  };
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
    console.warn(`[AI] Model ${modelName} failed. Error: ${err.message}.`);
    if (imageBuffer) {
      console.log("[AI] Attempting text-only fallback with gemini-2.5-flash...");
      try {
        modelName = "gemini-2.5-flash (text-only fallback)";
        const textOnlyParts = [{ text: prompt }];
        result = await apiInstances.textModel.generateContent({ contents: [{ role: "user", parts: textOnlyParts }] });
        rawText = result.response.text();
      } catch (err2) {
        console.warn("[AI] Text-only fallback also failed. Using local rule-based fallback...");
        const fallbackData = getLocalSymptomFallback(textDescription, profile);
        rawText = JSON.stringify(fallbackData);
        modelName = "Local Rule Engine";
      }
    } else {
      console.warn("[AI] Symptom analysis failed. Using local rule-based fallback...");
      const fallbackData = getLocalSymptomFallback(textDescription, profile);
      rawText = JSON.stringify(fallbackData);
      modelName = "Local Rule Engine";
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
