import os
import httpx
import json

def get_fallback_meal_plan():
    # A high-quality varied fallback plan to make sure days are not identical if AI fails
    meals = [
        {
            "day": "Thứ Hai",
            "breakfast": "Cháo cá hồi nấu hạt sen và 1 ly sữa tiệt trùng",
            "lunch": "Cơm gạo lứt, cá kho tộ, canh rau ngót luộc thịt nạc",
            "snack": "Sữa chua hoa quả chín",
            "dinner": "Cơm tẻ, thịt bò xào súp lơ xanh, canh bí đỏ thịt băm",
            "dailyNutrients": {"calories": 2200, "protein": "85g", "carbs": "290g", "fat": "65g", "iron": "15mg"}
        },
        {
            "day": "Thứ Ba",
            "breakfast": "Phở bò chín kỹ và 1 ly sữa đậu nành",
            "lunch": "Cơm tẻ, tôm ram mặn, cải thìa xào nấm đông cô, canh chua cá lóc",
            "snack": "Nước ép cam tươi và hạt hạnh nhân",
            "dinner": "Cơm gạo lứt, thịt heo luộc, đậu hũ sốt cà chua, canh rau mồng tơi thịt bằm",
            "dailyNutrients": {"calories": 2150, "protein": "82g", "carbs": "285g", "fat": "60g", "iron": "16mg"}
        },
        {
            "day": "Thứ Tư",
            "breakfast": "Bánh mì trứng ốp la chín kỹ kèm dưa leo và sữa tươi tiệt trùng",
            "lunch": "Cơm tẻ, gà kho sả ớt, xà lách trộn dầu giấm, canh khoai tây sườn heo",
            "snack": "Một quả táo chín và vài hạt óc chó",
            "dinner": "Cơm gạo lứt, chả cá thác lác sốt cà, rau lang luộc, canh củ cải thịt bằm",
            "dailyNutrients": {"calories": 2250, "protein": "88g", "carbs": "295g", "fat": "68g", "iron": "14mg"}
        },
        {
            "day": "Thứ Năm",
            "breakfast": "Súp gà ngô non nấm hương và 1 ly sữa tiệt trùng",
            "lunch": "Cơm tẻ, thịt ba chỉ kho trứng cút chín kỹ, bông cải xanh luộc, canh cua mồng tơi",
            "snack": "Sữa chua nếp cẩm hoặc trái cây tươi",
            "dinner": "Cơm tẻ, cá hồi áp chảo sốt bơ tỏi, măng tây xào, canh bí đao sườn non",
            "dailyNutrients": {"calories": 2300, "protein": "90g", "carbs": "300g", "fat": "70g", "iron": "17mg"}
        },
        {
            "day": "Thứ Sáu",
            "breakfast": "Cháo sườn non ngũ cốc và nước cam ấm",
            "lunch": "Cơm gạo lứt, mực xào dứa và cần tỏi, canh rau dền nấu tôm thịt",
            "snack": "Sinh tố bơ sữa tiệt trùng",
            "dinner": "Cơm tẻ, đậu hũ nhồi thịt chiên, cải bó xôi xào tỏi, canh bí đỏ thịt bằm",
            "dailyNutrients": {"calories": 2200, "protein": "84g", "carbs": "290g", "fat": "64g", "iron": "15mg"}
        },
        {
            "day": "Thứ Bảy",
            "breakfast": "Hủ tiếu Nam Vang chín kỹ và sữa tươi tiệt trùng",
            "lunch": "Cơm tẻ, bò sốt tiêu đen kèm ớt chuông, canh súp rau củ thập cẩm",
            "snack": "Chè sen hạt nhãn thanh mát",
            "dinner": "Cơm gạo lứt, cá thu sốt cà chua, đậu bắp luộc, canh khoai mỡ nấu tôm",
            "dailyNutrients": {"calories": 2180, "protein": "86g", "carbs": "288g", "fat": "62g", "iron": "16mg"}
        },
        {
            "day": "Chủ Nhật",
            "breakfast": "Bún mọc sườn chín kỹ và nước ép bưởi",
            "lunch": "Cơm tẻ, thịt heo quay kho dưa cải, đậu rồng xào tỏi, canh sườn nấu sấu",
            "snack": "Bánh bông lan trứng muối chín kỹ và sữa tươi",
            "dinner": "Cơm gạo lứt, gà hấp hành, bắp cải xào tôm khô, canh bầu nấu hến",
            "dailyNutrients": {"calories": 2220, "protein": "85g", "carbs": "292g", "fat": "66g", "iron": "15mg"}
        }
    ]
    return meals

async def get_ai_pregnancy_meal_plan(week: int):
    api_key = os.getenv("BIOMISTRAL_API_KEY")
    if not api_key:
        print("Warning: BIOMISTRAL_API_KEY environment variable is not set. Using high-quality fallback plan.")
        return get_fallback_meal_plan()

    # Use gemini-2.5-flash which is configured for this API key
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
Bạn là một chuyên gia dinh dưỡng phụ sản hàng đầu Việt Nam. Hãy lên thực đơn dinh dưỡng 7 ngày cho mẹ bầu ở tuần thai thứ {week}.
Thực đơn cần đầy đủ dinh dưỡng, phong phú món ăn chuẩn Việt Nam (như phở, cháo cá, cơm gạo lứt, cải thìa, cua mồng tơi, canh bí đỏ, v.v.), giàu Folate, Sắt, Canxi, và an toàn tuyệt đối cho thai nhi (không có trứng sống, cá sống, thịt tái, các loại rau củ không an toàn).
Đặc biệt: Thực đơn các ngày KHÔNG được trùng lặp nhau, món ăn của các ngày phải đa dạng và đổi bữa liên tục.

Hãy phản hồi dưới dạng JSON là một danh sách chứa đúng 7 phần tử tương ứng với 7 ngày trong tuần từ Thứ Hai đến Chủ Nhật.
Mỗi phần tử phải tuân thủ đúng cấu trúc JSON sau:
{{
  "day": "Thứ Hai", // hoặc "Thứ Ba", "Thứ Tư", ..., "Chủ Nhật"
  "breakfast": "Tên chi tiết món ăn bữa sáng và thức uống",
  "lunch": "Tên chi tiết món ăn bữa trưa",
  "snack": "Tên chi tiết món ăn bữa xế/phụ",
  "dinner": "Tên chi tiết món ăn bữa tối",
  "dailyNutrients": {{
    "calories": 2200, // Số nguyên đại diện lượng calories ước tính cả ngày (ví dụ: 2000-2400)
    "protein": "85g", // Chuỗi định dạng đạm
    "carbs": "290g", // Chuỗi định dạng carbs
    "fat": "65g", // Chuỗi định dạng fat
    "iron": "15mg" // Chuỗi định dạng iron
  }}
}}

Chú ý: Trả về JSON hợp lệ tuyệt đối, không có markdown code blocks (ví dụ: không có ```json ... ```), chỉ chứa nội dung JSON thuần túy.
"""

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"Calling Gemini API for maternal meal plan at week {week}...")
            response = await client.post(url, json=payload, timeout=30.0)
            if response.status_code == 200:
                result = response.json()
                text_content = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                meal_plan = json.loads(text_content)
                if isinstance(meal_plan, list) and len(meal_plan) == 7:
                    return meal_plan
                elif isinstance(meal_plan, dict) and "weekPlan" in meal_plan:
                    return meal_plan["weekPlan"]
                elif isinstance(meal_plan, dict) and "days" in meal_plan:
                    return meal_plan["days"]
                return meal_plan
            else:
                print(f"Gemini API returned error status code: {response.status_code}, response: {response.text}")
        except Exception as e:
            print(f"Error calling Gemini API: {e}")

    print("Falling back to local high-quality meal plan.")
    return get_fallback_meal_plan()
