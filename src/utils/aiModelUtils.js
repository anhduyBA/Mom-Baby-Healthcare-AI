import { GoogleGenerativeAI } from "@google/generative-ai";
import { PROMPTS, AI_BASE_RULES } from "../config/market.vn.js";

const bioMistralClient = new GoogleGenerativeAI(process.env.BIOMISTRAL_API_KEY);

export const analyzeHealthTrends = async (user, monitoringHistory) => {
  try {
    const model = bioMistralClient.getGenerativeModel({ model: "gemini-2.5-flash" });

    const dataSummary = monitoringHistory.map((entry, index) => ({
      day: index + 1,
      date: entry.date.toISOString().split('T')[0],
      sleep: `${entry.sleep?.hours || 0}h (quality: ${entry.sleep?.quality || 0}/5)`,
      water: `${entry.water?.liters || 0}L`,
      meals: `B:${entry.meals?.breakfast ? '✓' : '✗'} L:${entry.meals?.lunch ? '✓' : '✗'} D:${entry.meals?.dinner ? '✓' : '✗'}`,
      mood: `${entry.mood?.score || 0}/5${entry.mood?.note ? ` - ${entry.mood.note}` : ''}`,
      vitals: entry.vitals ? `Sugar:${entry.vitals.sugar} BP:${entry.vitals.bpHigh}/${entry.vitals.bpLow} Weight:${entry.vitals.weight}kg` : 'N/A',
      symptoms: entry.symptoms?.note || 'None'
    }));

    const prompt = PROMPTS.healthTrends(user, JSON.stringify(dataSummary, null, 2));

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error in AI health analysis:", error);
    return {
      summary: "Chưa phân tích chi tiết được. Hãy tiếp tục ghi nhật ký hằng ngày.",
      trends: {
        sleep: "Đã ghi nhận",
        hydration: "Đã ghi nhận",
        meals: "Đã ghi nhận",
        mood: "Đã ghi nhận",
        vitals: "Đã ghi nhận",
        symptoms: "Đã ghi nhận"
      },
      recommendations: [
        "Tiếp tục ghi nhật ký sức khỏe mỗi ngày",
        "Cố gắng ngủ đủ 7–8 tiếng khi không thi cử",
        "Uống đủ nước, hạn chế thức uống có caffeine buổi tối"
      ],
      concerns: [],
      dietFocus: "Ăn uống cân bằng, phù hợp ngân sách sinh viên"
    };
  }
};

export const getUserChatContext = async (user) => {
  try {
    const context = user.aiContext || {};
    let contextString = `User Profile: ${user.name}, Age: ${user.age || 'N/A'}, Gender: ${user.gender || 'N/A'}`;

    if (user.userType) contextString += `\nLoại tài khoản: ${user.userType}`;
    if (user.university) contextString += `\nTrường: ${user.university}`;
    if (user.diseaseTags?.length) contextString += `\nBệnh nền: ${user.diseaseTags.join(', ')}`;
    if (user.dietType) contextString += `\nChế độ ăn: ${user.dietType}`;
    if (context.healthSummary) contextString += `\n\nRecent Health Status: ${context.healthSummary}`;
    if (context.concerns?.length) contextString += `\nHealth Concerns: ${context.concerns.join(', ')}`;
    if (context.recommendations?.length) contextString += `\nActive Recommendations: ${context.recommendations.slice(0, 3).join('; ')}`;

    return contextString;
  } catch (error) {
    console.error("Error getting user chat context:", error);
    return `User: ${user.name}`;
  }
};

export const generateDietRecommendations = async (user, monitoringData, healthAnalysis) => {
  try {
    const model = bioMistralClient.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
${AI_BASE_RULES}

Hồ sơ: ${user.name}, chế độ ăn ${user.dietType || "đa dạng"}
Hôm nay: ngủ ${monitoringData.sleep?.hours || 0}h, nước ${monitoringData.water?.liters || 0}L, tâm trạng ${monitoringData.mood?.score || 0}/5
Phân tích: ${healthAnalysis.summary}
Trọng tâm dinh dưỡng: ${healthAnalysis.dietFocus}

Tạo thực đơn 1 ngày (sáng, trưa, tối) món Việt cho sinh viên. Trả về JSON.
`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse diet recommendations");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error generating diet recommendations:", error);
    return null;
  }
};
