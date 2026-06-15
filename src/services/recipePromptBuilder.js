/**
 * Builds the recipe prompt for the Gemini AI model.
 * 
 * @param {Object} profile - Classified student profile.
 * @param {string} profile.profileName - Human-readable profile name.
 * @param {string[]} profile.nutritionNeeds - List of active nutritional goals.
 * @param {Object} [preferences={}] - User dietary/cooking preferences.
 * @param {string} [preferences.dietType] - Vegetarian, regular, etc.
 * @param {string} [preferences.allergies] - Allergy warnings.
 * @param {string|number} [preferences.maxCookTime] - Maximum minutes.
 * @param {string} [preferences.availableIngredients] - List of ingredients in student pantry.
 * @returns {string} Fully structured text prompt.
 */
export function buildRecipePrompt(profile, preferences = {}) {
  return `
Bạn là chuyên gia dinh dưỡng và đầu bếp chuyên nghiệp cho mẹ và bé thuộc ứng dụng "Mom Ơi!".

CONTEXT VỀ MẸ & BÉ:
- Giai đoạn hành trình: ${profile.profileName}
- Nhu cầu dinh dưỡng chính: ${profile.nutritionNeeds.join(", ")}
- Chế độ ăn đặc biệt: ${preferences.dietType || "Thường (đầy đủ dưỡng chất)"}
- Dị ứng hoặc kiêng: ${preferences.allergies || "Không có"}
- Thời gian chuẩn bị tối đa: ${preferences.maxCookTime || "30 phút"}
- Nguyên liệu khả dụng: ${preferences.availableIngredients || "Không giới hạn"}

YÊU CẦU:
Tạo 3 công thức món ăn (hoặc món ăn dặm nếu trong giai đoạn sau sinh/chăm bé) bổ dưỡng, an toàn và khoa học.
Mỗi công thức phải bao gồm:
1. Tên món ăn (tiếng Việt)
2. Mô tả ngắn (1-2 câu) về lợi ích sức khỏe dành cho mẹ/bé tại giai đoạn tương ứng
3. Nguyên liệu cụ thể với số lượng rõ ràng
4. Các bước thực hiện chi tiết (đánh số)
5. Thông tin dinh dưỡng ước tính (calories, protein, carbs, fat)
6. Thời gian chuẩn bị + nấu
7. Độ khó: Dễ / Trung bình / Khó
8. Tags: ví dụ ["bổ-sắt", "lợi-sữa", "ăn-dặm-6-tháng", "dễ-tiêu-hóa"]

QUAN TRỌNG: Trả về JSON hợp lệ theo format sau, KHÔNG thêm text ngoài JSON:
{
  "recipes": [
    {
      "title": "...",
      "description": "...",
      "ingredients": [{"name":"...","amount":"...","unit":"..."}],
      "steps": [{"stepNumber":1,"instruction":"...","duration":"..."}],
      "nutritionInfo": {"calories":0,"protein":"...","carbs":"...","fat":"...","prepTime":"...","difficulty":"..."},
      "tags": ["..."]
    }
  ]
}
  `.trim();
}
