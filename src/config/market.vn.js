/**
 * Cấu hình thị trường Việt Nam — dùng chung cho prompt AI, SMS, scheduler, thông báo.
 * HealthSync phiên bản VN: ưu tiên sinh viên đại học / cao đẳng.
 */
export const MARKET = {
  country: "VN",
  locale: "vi-VN",
  phoneCountryCode: "84",
  timezone: "Asia/Ho_Chi_Minh",
  audience: "sinh viên đại học và cao đẳng tại Việt Nam",
  cuisine: "ẩm thực Việt Nam",
};

/** Hướng dẫn chung gắn vào mọi prompt AI */
export const AI_BASE_RULES = `
- Luôn trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu.
- Đối tượng: ${MARKET.audience}.
- Ưu tiên ${MARKET.cuisine}: phở, cơm, bún, canh, rau, món quán/căn tin, nguyên liệu phổ biến tại VN.
- Cân nhắc lối sống sinh viên: thiếu ngủ, học đêm, stress thi cử, ăn uống không đều, ngân sách thấp.
- Không thay thế bác sĩ; khuyến khích đi cơ sở y tế/trạm y tế trường khi triệu chứng nặng.
`.trim();

export const PROMPTS = {
  symptomAnalysis: (textDescription) => `
Bạn là trợ lý y tế AI cho ứng dụng HealthSync (Việt Nam).
${AI_BASE_RULES}

Triệu chứng người dùng: "${textDescription}"

Nhiệm vụ:
1. Gợi ý tình trạng có thể (không chẩn đoán chính thức).
2. Đánh giá mức độ nghiêm trọng (0-100): 0-30 thấp, 31-69 trung bình, 70-100 cao.
3. Đưa khuyến nghị thực tế cho sinh viên.

Chỉ trả về JSON:
{
  "predicted_condition": "Tên tình trạng (tiếng Việt)",
  "severity_score": number,
  "severity_level": "low" | "medium" | "high",
  "recommendations": {
    "diet": ["gợi ý ăn uống VN"],
    "habits": ["thói quen"],
    "doctor": "Khi nào nên đi khám"
  }
}
`,

  healthTrends: (user, dataSummaryJson) => `
Bạn phân tích xu hướng sức khỏe cho HealthSync Việt Nam.
${AI_BASE_RULES}

Hồ sơ: ${user.name}, ${user.age || "N/A"} tuổi, ${user.gender || "N/A"}, ${user.height || "N/A"}cm, ${user.weight || "N/A"}kg
Bệnh nền: ${user.diseaseTags?.join(", ") || "Không"}
Chế độ ăn: ${user.dietType || "Không"}
Loại tài khoản: ${user.userType || "student"}${user.university ? `, Trường: ${user.university}` : ""}

Dữ liệu theo dõi hàng ngày:
${dataSummaryJson}

Trả về JSON: summary, trends (object), recommendations (array), concerns (array), dietFocus (string).
`,

  weeklyDietPlan: (context) => `
Tạo thực đơn 7 ngày (sáng, trưa, tối) cho người dùng Việt Nam.
${AI_BASE_RULES}

${context}

Yêu cầu: món Việt, phù hợp chế độ ăn và bệnh nền, chi phí hợp lý sinh viên, có calo và nguyên liệu.

JSON:
{
  "weekPlan": [
    { "day": "Monday", "meals": [{ "mealType": "Breakfast", "recipe": "...", "calories": 300, "ingredients": ["..."], "steps": ["..."] }] }
  ]
}
Chỉ trả JSON.
`,

  singleRecipe: (query) => `
Tạo 1 công thức món Việt Nam theo yêu cầu: "${query}".
${AI_BASE_RULES}
JSON: recipe, calories, ingredients, steps, youtubeLink (có thể rỗng). Chỉ trả JSON.
`,

  multiRecipes: (query) => `
Tạo 3 công thức món Việt Nam theo: "${query}".
${AI_BASE_RULES}
JSON array: [{ recipe, calories, ingredients, steps, youtubeLink }]. Chỉ trả JSON array.
`,

  chatSystem: (userContext, userMessage) => `
Bạn là trợ lý sức khỏe & dinh dưỡng HealthSync cho sinh viên Việt Nam.
${AI_BASE_RULES}

${userContext}

Tin nhắn: "${userMessage}"
`,

  recipeImage: (recipeName) =>
    `Photo of delicious Vietnamese dish: ${recipeName}, food photography, professional`,
};

/** Cron UTC: 00:00 = 7:00 sáng VN, 13:00 = 20:00 tối VN (UTC+7) */
export const SCHEDULER_UTC = {
  monitoringMorningHour: 0,
  monitoringEveningHour: 13,
  routineHealthCheckHour: 0, // 7:00 sáng VN
};

export const REMINDER_MESSAGES = {
  morning: {
    subject: "🌅 HealthSync — Ghi nhật ký sức khỏe buổi sáng",
    body: (name, url) =>
      `Chào ${name}!\n\nĐã đến lúc ghi nhật ký sức khỏe hôm nay (giấc ngủ, nước, bữa ăn, tâm trạng, chỉ số).\n\n${url}/daily-monitoring\n\nChúc bạn một ngày học tập khỏe mạnh! 💚`,
    sms: (name, url) =>
      `HealthSync: ${name}, ghi nhật ký sức khỏe hôm nay nhé! ${url}/daily-monitoring`,
  },
  evening: {
    subject: "⏰ HealthSync — Nhắc hoàn thành nhật ký trong ngày",
    body: (name, url) =>
      `Chào ${name},\n\nBạn chưa ghi nhật ký sức khỏe hôm nay. Hãy hoàn thành trước khi nghỉ.\n\n${url}/daily-monitoring`,
    sms: (name, url) =>
      `HealthSync: ${name}, nhớ ghi nhật ký sức khỏe hôm nay! ${url}/daily-monitoring`,
  },
  routineCheck: "Nhắc kiểm tra sức khỏe định kỳ — hãy cập nhật nhật ký hoặc triệu chứng nếu cần.",
  medication: (medName, dosage) =>
    `Đến giờ uống thuốc: ${medName}. Liều: ${dosage}.`,
  criticalSymptom: (condition, score) =>
    `CẢNH BÁO SỨC KHỎE: Có thể ${condition}. Mức độ: ${score}/100. Nên đi khám nếu triệu chứng kéo dài.`,
};
