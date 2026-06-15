import os
import sys
from sqlalchemy.orm import Session

# Add project root to sys.path so we can import from database and models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.ingredient import Ingredient
from models.recipe import Recipe, RecipeIngredient

# 1. Baseline ingredients database static definitions (for absolute offline resiliency)
SEED_INGREDIENTS = [
    {"english_name": "Rice", "vietnamese_name": "Gạo tẻ", "calories_kcal": 360.0, "protein_g": 6.5, "fat_g": 0.6, "carbs_g": 80.0, "iron_mg": 0.8, "zinc_mg": 1.1, "calcium_mg": 10.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.0, "food_group": "Ngũ cốc"},
    {"english_name": "Sweet potato", "vietnamese_name": "Khoai lang", "calories_kcal": 86.0, "protein_g": 1.6, "fat_g": 0.1, "carbs_g": 20.0, "iron_mg": 0.6, "zinc_mg": 0.3, "calcium_mg": 30.0, "vitamin_c_mg": 2.4, "omega3_mg": 0.0, "food_group": "Rau củ"},
    {"english_name": "Beef", "vietnamese_name": "Thịt bò", "calories_kcal": 250.0, "protein_g": 26.0, "fat_g": 15.0, "carbs_g": 0.0, "iron_mg": 2.6, "zinc_mg": 6.0, "calcium_mg": 18.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.0, "food_group": "Thịt"},
    {"english_name": "Chicken breast", "vietnamese_name": "Ức gà", "calories_kcal": 165.0, "protein_g": 31.0, "fat_g": 3.6, "carbs_g": 0.0, "iron_mg": 1.0, "zinc_mg": 1.0, "calcium_mg": 15.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.0, "food_group": "Thịt"},
    {"english_name": "Pork", "vietnamese_name": "Thịt heo", "calories_kcal": 242.0, "protein_g": 27.0, "fat_g": 14.0, "carbs_g": 0.0, "iron_mg": 0.9, "zinc_mg": 2.5, "calcium_mg": 19.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.0, "food_group": "Thịt"},
    {"english_name": "Chicken liver", "vietnamese_name": "Gan gà", "calories_kcal": 119.0, "protein_g": 17.0, "fat_g": 4.8, "carbs_g": 0.7, "iron_mg": 9.0, "zinc_mg": 2.7, "calcium_mg": 8.0, "vitamin_c_mg": 18.0, "omega3_mg": 0.0, "food_group": "Thịt"},
    {"english_name": "Salmon", "vietnamese_name": "Cá hồi", "calories_kcal": 208.0, "protein_g": 20.0, "fat_g": 13.0, "carbs_g": 0.0, "iron_mg": 0.3, "zinc_mg": 0.4, "calcium_mg": 9.0, "vitamin_c_mg": 0.0, "omega3_mg": 1.0, "food_group": "Cá"},
    {"english_name": "Tuna", "vietnamese_name": "Cá ngừ", "calories_kcal": 132.0, "protein_g": 28.0, "fat_g": 1.3, "carbs_g": 0.0, "iron_mg": 1.0, "zinc_mg": 0.8, "calcium_mg": 10.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.2, "food_group": "Cá"},
    {"english_name": "Egg yolk", "vietnamese_name": "Lòng đỏ trứng", "calories_kcal": 322.0, "protein_g": 16.0, "fat_g": 26.0, "carbs_g": 3.6, "iron_mg": 2.7, "zinc_mg": 2.3, "calcium_mg": 129.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.1, "food_group": "Trứng/Sữa"},
    {"english_name": "Tofu", "vietnamese_name": "Đậu phụ", "calories_kcal": 76.0, "protein_g": 8.0, "fat_g": 4.8, "carbs_g": 1.9, "iron_mg": 5.4, "zinc_mg": 0.8, "calcium_mg": 350.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.0, "food_group": "Trứng/Sữa"},
    {"english_name": "Shrimp", "vietnamese_name": "Tôm", "calories_kcal": 99.0, "protein_g": 24.0, "fat_g": 0.3, "carbs_g": 0.2, "iron_mg": 0.5, "zinc_mg": 1.1, "calcium_mg": 70.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.1, "food_group": "Cá"},
    {"english_name": "Pumpkin", "vietnamese_name": "Bí đỏ", "calories_kcal": 26.0, "protein_g": 1.0, "fat_g": 0.1, "carbs_g": 6.5, "iron_mg": 0.8, "zinc_mg": 0.3, "calcium_mg": 21.0, "vitamin_c_mg": 9.0, "omega3_mg": 0.0, "food_group": "Rau củ"},
    {"english_name": "Carrot", "vietnamese_name": "Cà rốt", "calories_kcal": 41.0, "protein_g": 0.9, "fat_g": 0.2, "carbs_g": 9.6, "iron_mg": 0.3, "zinc_mg": 0.2, "calcium_mg": 33.0, "vitamin_c_mg": 5.9, "omega3_mg": 0.0, "food_group": "Rau củ"},
    {"english_name": "Broccoli", "vietnamese_name": "Bông cải xanh", "calories_kcal": 34.0, "protein_g": 2.8, "fat_g": 0.4, "carbs_g": 6.6, "iron_mg": 0.7, "zinc_mg": 0.4, "calcium_mg": 47.0, "vitamin_c_mg": 89.0, "omega3_mg": 0.0, "food_group": "Rau củ"},
    {"english_name": "Spinach", "vietnamese_name": "Rau bina", "calories_kcal": 23.0, "protein_g": 2.9, "fat_g": 0.4, "carbs_g": 3.6, "iron_mg": 2.7, "zinc_mg": 0.5, "calcium_mg": 99.0, "vitamin_c_mg": 28.0, "omega3_mg": 0.0, "food_group": "Rau củ"},
    {"english_name": "Oats", "vietnamese_name": "Yến mạch", "calories_kcal": 389.0, "protein_g": 16.9, "fat_g": 6.9, "carbs_g": 66.3, "iron_mg": 4.7, "zinc_mg": 4.0, "calcium_mg": 54.0, "vitamin_c_mg": 0.0, "omega3_mg": 0.0, "food_group": "Ngũ cốc"},
    {"english_name": "Banana", "vietnamese_name": "Chuối", "calories_kcal": 89.0, "protein_g": 1.1, "fat_g": 0.3, "carbs_g": 22.8, "iron_mg": 0.3, "zinc_mg": 0.2, "calcium_mg": 5.0, "vitamin_c_mg": 8.7, "omega3_mg": 0.0, "food_group": "Trứng/Sữa"},
    {"english_name": "Apple", "vietnamese_name": "Táo", "calories_kcal": 52.0, "protein_g": 0.3, "fat_g": 0.2, "carbs_g": 13.8, "iron_mg": 0.1, "zinc_mg": 0.0, "calcium_mg": 6.0, "vitamin_c_mg": 4.6, "omega3_mg": 0.0, "food_group": "Trứng/Sữa"},
    {"english_name": "Avocado", "vietnamese_name": "Bơ", "calories_kcal": 160.0, "protein_g": 2.0, "fat_g": 15.0, "carbs_g": 8.5, "iron_mg": 0.6, "zinc_mg": 0.6, "calcium_mg": 12.0, "vitamin_c_mg": 10.0, "omega3_mg": 0.0, "food_group": "Trứng/Sữa"},
    {"english_name": "Mango", "vietnamese_name": "Xoài", "calories_kcal": 60.0, "protein_g": 0.8, "fat_g": 0.4, "carbs_g": 15.0, "iron_mg": 0.2, "zinc_mg": 0.1, "calcium_mg": 11.0, "vitamin_c_mg": 36.4, "omega3_mg": 0.0, "food_group": "Trứng/Sữa"}
]

# 2. Complete Recipe lists
SEED_RECIPES = [
    {
        "name_vi": "Cháo gạo trắng",
        "name_en": "White Rice Porridge",
        "description": "Món ăn dặm đầu tiên đơn giản, dễ nuốt cho bé cưng.",
        "meal_type": "breakfast",
        "texture": "puree",
        "min_age_months": 6,
        "max_age_months": 8,
        "prep_time_min": 5,
        "allergens": [],
        "tags": ["dễ nuốt", "dễ tiêu hóa", "truyền thống"],
        "cooking_steps": [
            {"step": 1, "instruction": "Vo sạch gạo tẻ.", "duration": "2 phút"},
            {"step": 2, "instruction": "Nấu gạo với nước tỷ lệ 1:10 cho chín nhừ.", "duration": "20 phút"},
            {"step": 3, "instruction": "Rây cháo mịn để bé làm quen.", "duration": "5 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0}
        ]
    },
    {
        "name_vi": "Cháo bí đỏ thơm ngon",
        "name_en": "Sweet Pumpkin Porridge",
        "description": "Bí đỏ ngọt dịu, nhiều vitamin A giúp mắt bé sáng ngời.",
        "meal_type": "lunch",
        "texture": "puree",
        "min_age_months": 6,
        "max_age_months": 8,
        "prep_time_min": 5,
        "allergens": [],
        "tags": ["giàu vitamin A", "màu sắc", "mát"],
        "cooking_steps": [
            {"step": 1, "instruction": "Gọt vỏ bí đỏ và thái miếng mỏng hấp chín nhừ.", "duration": "10 phút"},
            {"step": 2, "instruction": "Nấu gạo tẻ thành cháo loãng chín mềm.", "duration": "20 phút"},
            {"step": 3, "instruction": "Tán nhuyễn bí đỏ hòa cùng cháo rồi rây qua lưới mịn.", "duration": "5 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0},
            {"name_en": "Pumpkin", "weight_grams": 40.0}
        ]
    },
    {
        "name_vi": "Bột khoai lang nghiền sữa",
        "name_en": "Mashed Sweet Potato with Milk",
        "description": "Món phụ ngọt bùi, dễ ăn và ngừa táo bón cho bé.",
        "meal_type": "snack",
        "texture": "puree",
        "min_age_months": 6,
        "max_age_months": 12,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["dễ làm", "ngừa táo bón", "ngọt bùi"],
        "cooking_steps": [
            {"step": 1, "instruction": "Rửa sạch khoai lang, gọt vỏ rồi hấp chín nhừ.", "duration": "15 phút"},
            {"step": 2, "instruction": "Nghiền nát khoai lang khi còn ấm.", "duration": "5 phút"},
            {"step": 3, "instruction": "Hòa thêm một chút nước ấm hoặc sữa công thức để có độ loãng mịn thích hợp.", "duration": "2 phút"}
        ],
        "ingredients": [
            {"name_en": "Sweet potato", "weight_grams": 60.0}
        ]
    },
    {
        "name_vi": "Cháo thịt bò cà rốt",
        "name_en": "Beef and Carrot Porridge",
        "description": "Bổ sung sắt dồi dào cho bé từ 7 tháng tuổi.",
        "meal_type": "dinner",
        "texture": "puree",
        "min_age_months": 7,
        "max_age_months": 9,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["giàu sắt", "bổ dưỡng", "thơm ngon"],
        "cooking_steps": [
            {"step": 1, "instruction": "Băm nhỏ thịt bò, cà rốt thái hạt lựu đem hấp chín.", "duration": "10 phút"},
            {"step": 2, "instruction": "Nấu chín cháo tẻ.", "duration": "20..."},
            {"step": 3, "instruction": "Cho thịt bò và cà rốt vào xay nhuyễn mịn cùng cháo ấm.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0},
            {"name_en": "Beef", "weight_grams": 25.0},
            {"name_en": "Carrot", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cháo gan gà giàu sắt",
        "name_en": "Iron-Rich Chicken Liver Porridge",
        "description": "Lượng sắt tự nhiên cực cao phòng ngừa thiếu máu ở trẻ.",
        "meal_type": "lunch",
        "texture": "puree",
        "min_age_months": 7,
        "max_age_months": 9,
        "prep_time_min": 15,
        "allergens": [],
        "tags": ["siêu giàu sắt", "bổ máu"],
        "cooking_steps": [
            {"step": 1, "instruction": "Rửa sạch gan gà, ngâm sữa tươi 15 phút để khử độc.", "duration": "15 phút"},
            {"step": 2, "instruction": "Hấp chín gan gà với vài lát gừng để khử mùi tanh.", "duration": "8 phút"},
            {"step": 3, "instruction": "Xay mịn gan gà cùng cháo chín mềm cho bé thưởng thức.", "duration": "5 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0},
            {"name_en": "Chicken liver", "weight_grams": 20.0}
        ]
    },
    {
        "name_vi": "Cháo lòng đỏ trứng gà",
        "name_en": "Egg Yolk Porridge",
        "description": "Lòng đỏ trứng gà béo ngậy chứa nhiều omega-3 và lecithin phát triển trí não.",
        "meal_type": "breakfast",
        "texture": "puree",
        "min_age_months": 6,
        "max_age_months": 8,
        "prep_time_min": 5,
        "allergens": ["egg"],
        "tags": ["bổ não", "béo ngậy", "dễ ăn"],
        "cooking_steps": [
            {"step": 1, "instruction": "Luộc chín trứng gà, chỉ lấy lòng đỏ tán mịn.", "duration": "10 phút"},
            {"step": 2, "instruction": "Hòa lòng đỏ vào cháo nóng, đun nhỏ lửa thêm 2 phút.", "duration": "2 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0},
            {"name_en": "Egg yolk", "weight_grams": 15.0}
        ]
    },
    {
        "name_vi": "Cháo cá hồi rau bina",
        "name_en": "Salmon and Spinach Porridge",
        "description": "Món ăn giàu Omega-3 giúp trí não bé phát triển thông minh vượt trội.",
        "meal_type": "dinner",
        "texture": "thin_porridge",
        "min_age_months": 8,
        "max_age_months": 11,
        "prep_time_min": 10,
        "allergens": ["fish"],
        "tags": ["giàu DHA", "phát triển trí não", "thơm ngon"],
        "cooking_steps": [
            {"step": 1, "instruction": "Cá hồi áp chảo hoặc hấp chín, tán nhỏ.", "duration": "7 phút"},
            {"step": 2, "instruction": "Rau bina luộc chín băm thật nhỏ.", "duration": "5 phút"},
            {"step": 3, "instruction": "Cho cá hồi, rau bina vào đun cùng cháo ấm đun sôi lại.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0},
            {"name_en": "Salmon", "weight_grams": 30.0},
            {"name_en": "Spinach", "weight_grams": 20.0}
        ]
    },
    {
        "name_vi": "Bơ chuối nghiền mịn",
        "name_en": "Mashed Avocado and Banana",
        "description": "Sự kết hợp thơm mát, béo bùi nhiều chất béo có lợi.",
        "meal_type": "snack",
        "texture": "puree",
        "min_age_months": 6,
        "max_age_months": 12,
        "prep_time_min": 5,
        "allergens": [],
        "tags": ["chất béo tốt", "không cần nấu", "mát"],
        "cooking_steps": [
            {"step": 1, "instruction": "Cắt bơ lấy thịt quả, chuối bóc vỏ cắt lát.", "duration": "2 phút"},
            {"step": 2, "instruction": "Dùng thìa tán thật nhuyễn hai loại quả hoặc cho vào máy xay xay mịn.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Avocado", "weight_grams": 30.0},
            {"name_en": "Banana", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cháo đậu hũ cà rốt hạt lựu",
        "name_en": "Tofu and Carrot Porridge",
        "description": "Món ăn thanh đạm chứa nhiều canxi từ đậu hũ non.",
        "meal_type": "breakfast",
        "texture": "thin_porridge",
        "min_age_months": 9,
        "max_age_months": 12,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["giàu canxi", "thanh đạm", "mềm mịn"],
        "cooking_steps": [
            {"step": 1, "instruction": "Cà rốt xắt hạt lựu cực nhỏ rồi đem hấp chín nhừ.", "duration": "10 phút"},
            {"step": 2, "instruction": "Đậu hũ non chần nước sôi, nghiền sơ.", "duration": "3 phút"},
            {"step": 3, "instruction": "Cho cà rốt và đậu hũ vào cháo hạt vỡ đun sôi khoảng 3 phút.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 25.0},
            {"name_en": "Tofu", "weight_grams": 35.0},
            {"name_en": "Carrot", "weight_grams": 25.0}
        ]
    },
    {
        "name_vi": "Cháo tôm bông cải xanh",
        "name_en": "Shrimp and Broccoli Porridge",
        "description": "Tôm tươi giàu canxi ngọt nước kết hợp với bông cải nhiều chất xơ.",
        "meal_type": "lunch",
        "texture": "thin_porridge",
        "min_age_months": 10,
        "max_age_months": 14,
        "prep_time_min": 12,
        "allergens": ["shellfish"],
        "tags": ["tăng chiều cao", "chất xơ", "vị ngọt tự nhiên"],
        "cooking_steps": [
            {"step": 1, "instruction": "Bóc vỏ tôm, bỏ chỉ lưng rồi băm nhuyễn.", "duration": "8 phút"},
            {"step": 2, "instruction": "Bông cải xanh hấp chín rồi băm nhỏ.", "duration": "7 phút"},
            {"step": 3, "instruction": "Đun chín tôm với cháo hạt vỡ, sau đó cho bông cải vào đun sôi.", "duration": "4 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 25.0},
            {"name_en": "Shrimp", "weight_grams": 30.0},
            {"name_en": "Broccoli", "weight_grams": 25.0}
        ]
    },
    {
        "name_vi": "Cháo thịt heo khoai tây hạt vỡ",
        "name_en": "Pork and Potato Thick Porridge",
        "description": "Cháo đặc giàu tinh bột và protein cho bé tăng cân khỏe mạnh.",
        "meal_type": "dinner",
        "texture": "thick_porridge",
        "min_age_months": 12,
        "max_age_months": 18,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["giàu đạm", "tăng cân tốt"],
        "cooking_steps": [
            {"step": 1, "instruction": "Băm nhỏ thịt heo. Khoai tây gọt vỏ thái hạt lựu luộc chín bở.", "duration": "10 phút"},
            {"step": 2, "instruction": "Nấu cháo hạt vỡ đặc.", "duration": "20 phút"},
            {"step": 3, "instruction": "Cho thịt heo và khoai tây tán nhuyễn vào đun nhỏ lửa đến khi thịt chín đều.", "duration": "5 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 30.0},
            {"name_en": "Pork", "weight_grams": 30.0},
            {"name_en": "Sweet potato", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cơm nát cá ngừ đại dương",
        "name_en": "Soft Rice with Tuna",
        "description": "Món cơm nát thô cho trẻ tập kỹ năng nhai nuốt tích cực.",
        "meal_type": "lunch",
        "texture": "soft_solid",
        "min_age_months": 18,
        "max_age_months": 24,
        "prep_time_min": 15,
        "allergens": ["fish"],
        "tags": ["tập nhai", "giàu đạm", "omega-3"],
        "cooking_steps": [
            {"step": 1, "instruction": "Nấu cơm nát hạt dẻo mềm.", "duration": "25 phút"},
            {"step": 2, "instruction": "Cá ngừ đem hấp chín, dầm nhỏ tơi.", "duration": "10 phút"},
            {"step": 3, "instruction": "Trộn cá ngừ tơi đều cùng bát cơm nát ấm nóng cho bé tập bốc hoặc xúc.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 40.0},
            {"name_en": "Tuna", "weight_grams": 40.0}
        ]
    },
    {
        "name_vi": "Cháo yến mạch chuối tiêu",
        "name_en": "Banana Oat Porridge",
        "description": "Bữa sáng nhiều năng lượng và chất xơ hòa tan hỗ trợ ruột bé tốt.",
        "meal_type": "breakfast",
        "texture": "puree",
        "min_age_months": 7,
        "max_age_months": 10,
        "prep_time_min": 5,
        "allergens": [],
        "tags": ["chất xơ tiêu hóa", "bữa sáng nhanh", "thơm chuối"],
        "cooking_steps": [
            {"step": 1, "instruction": "Ngâm yến mạch với nước lọc trong 5 phút.", "duration": "5 phút"},
            {"step": 2, "instruction": "Đun sôi yến mạch khuấy đều tay trong 5 phút đến khi chín sánh.", "duration": "5 phút"},
            {"step": 3, "instruction": "Nghiền mịn chuối tiêu chín rồi khuấy cùng cháo yến mạch ấm.", "duration": "2 phút"}
        ],
        "ingredients": [
            {"name_en": "Oats", "weight_grams": 20.0},
            {"name_en": "Banana", "weight_grams": 40.0}
        ]
    },
    {
        "name_vi": "Súp bông cải phô mai",
        "name_en": "Creamy Broccoli and Egg Yolk Soup",
        "description": "Món ăn dặm béo bùi, giàu canxi tăng cường chiều cao vượt trội.",
        "meal_type": "snack",
        "texture": "thin_porridge",
        "min_age_months": 9,
        "max_age_months": 15,
        "prep_time_min": 10,
        "allergens": ["egg"],
        "tags": ["chất béo tốt", "giàu canxi", "snack bổ"],
        "cooking_steps": [
            {"step": 1, "instruction": "Hấp chín bông cải xanh và lòng đỏ trứng gà.", "duration": "10 phút"},
            {"step": 2, "instruction": "Cho bông cải và trứng vào máy xay cùng nước ấm hoặc sữa công thức, xay nhuyễn dạng súp.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Broccoli", "weight_grams": 50.0},
            {"name_en": "Egg yolk", "weight_grams": 10.0}
        ]
    },
    {
        "name_vi": "Cháo ức gà bí đỏ",
        "name_en": "Chicken and Pumpkin Porridge",
        "description": "Protein nạc dễ tiêu hóa từ ức gà kết hợp bí đỏ bổ não.",
        "meal_type": "lunch",
        "texture": "thin_porridge",
        "min_age_months": 8,
        "max_age_months": 12,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["đạm dễ tiêu", "giàu vitamin A"],
        "cooking_steps": [
            {"step": 1, "instruction": "Băm nhỏ ức gà. Bí đỏ gọt vỏ thái mỏng hấp chín tán nhỏ.", "duration": "10 phút"},
            {"step": 2, "instruction": "Cho thịt gà vào đảo chín rồi đổ vào nồi cháo hạt vỡ đun sôi.", "duration": "5 phút"},
            {"step": 3, "instruction": "Cho bí đỏ tán nhuyễn vào đun sôi lại thêm 2 phút.", "duration": "2 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 20.0},
            {"name_en": "Chicken breast", "weight_grams": 30.0},
            {"name_en": "Pumpkin", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cháo bò băm rau bina chín",
        "name_en": "Minced Beef and Spinach Porridge",
        "description": "Cặp bài trùng bổ sung sắt và vitamin C tự nhiên tối ưu.",
        "meal_type": "dinner",
        "texture": "thin_porridge",
        "min_age_months": 9,
        "max_age_months": 14,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["phòng ngừa thiếu sắt", "chất xơ", "dễ hấp thu"],
        "cooking_steps": [
            {"step": 1, "instruction": "Thịt bò băm thật nhuyễn. Rau bina chần chín băm nhỏ.", "duration": "8 phút"},
            {"step": 2, "instruction": "Cho thịt bò đun cùng cháo ấm vỡ hạt đến khi chín.", "duration": "5 phút"},
            {"step": 3, "instruction": "Thêm rau bina băm vào khuấy đều sôi bùng lên rồi tắt bếp.", "duration": "2 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 25.0},
            {"name_en": "Beef", "weight_grams": 20.0},
            {"name_en": "Spinach", "weight_grams": 25.0}
        ]
    },
    {
        "name_vi": "Táo chín nghiền mịn",
        "name_en": "Steamed Mashed Apple",
        "description": "Táo hấp chín làm dịu vị chua, kích thích khẩu vị của bé.",
        "meal_type": "snack",
        "texture": "puree",
        "min_age_months": 6,
        "max_age_months": 12,
        "prep_time_min": 8,
        "allergens": [],
        "tags": ["vitamin C", "tráng miệng ngọt", "hỗ trợ tiêu hóa"],
        "cooking_steps": [
            {"step": 1, "instruction": "Táo gọt vỏ bỏ lõi hạt, xắt miếng đem hấp chín mềm.", "duration": "8 phút"},
            {"step": 2, "instruction": "Dùng rây lưới nghiền táo nhuyễn mịn lấy nước và cơm táo mềm.", "duration": "4 phút"}
        ],
        "ingredients": [
            {"name_en": "Apple", "weight_grams": 60.0}
        ]
    },
    {
        "name_vi": "Bột yến mạch táo ngọt táo quân",
        "name_en": "Apple Oatmeal Porridge",
        "description": "Bữa phụ thơm mùi yến mạch táo chín ngọt tự nhiên.",
        "meal_type": "snack",
        "texture": "thin_porridge",
        "min_age_months": 8,
        "max_age_months": 14,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["vị ngọt tự nhiên", "snack nhanh"],
        "cooking_steps": [
            {"step": 1, "instruction": "Hấp chín táo gọt vỏ, xay nhuyễn mịn.", "duration": "8 phút"},
            {"step": 2, "instruction": "Nấu chín yến mạch mịn rồi khuấy chung cùng táo nghiền ngọt.", "duration": "5 phút"}
        ],
        "ingredients": [
            {"name_en": "Oats", "weight_grams": 25.0},
            {"name_en": "Apple", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cơm nát thịt bò băm xào mềm",
        "name_en": "Soft Rice with Stir-fried Beef",
        "description": "Món cơm thô đầy màu sắc kích thích khả năng nhai nuốt độc lập.",
        "meal_type": "dinner",
        "texture": "soft_solid",
        "min_age_months": 18,
        "max_age_months": 24,
        "prep_time_min": 15,
        "allergens": [],
        "tags": ["tập nhai", "giàu dinh dưỡng", "đủ chất"],
        "cooking_steps": [
            {"step": 1, "instruction": "Nấu cơm nát dẻo mềm.", "duration": "25 phút"},
            {"step": 2, "instruction": "Thịt bò và bông cải xanh băm nhỏ xào sơ qua với chút dầu ăn dặm.", "duration": "8 phút"},
            {"step": 3, "instruction": "Đơm cơm ra đĩa rắc thịt bò xào bông cải thơm lên trên cơm.", "duration": "2 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 45.0},
            {"name_en": "Beef", "weight_grams": 35.0},
            {"name_en": "Broccoli", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cháo tôm bí đỏ mịn ngọt",
        "name_en": "Shrimp and Pumpkin Porridge",
        "description": "Bí đỏ giàu dinh dưỡng sánh dẻo hòa quyện với tôm ngọt lịm.",
        "meal_type": "dinner",
        "texture": "thin_porridge",
        "min_age_months": 9,
        "max_age_months": 14,
        "prep_time_min": 12,
        "allergens": ["shellfish"],
        "tags": ["giàu canxi", "mắt sáng"],
        "cooking_steps": [
            {"step": 1, "instruction": "Bí đỏ gọt vỏ thái mỏng hấp chín nhừ tán mịn.", "duration": "10 phút"},
            {"step": 2, "instruction": "Tôm bóc vỏ bỏ chỉ băm nhuyễn, phi thơm sơ qua.", "duration": "5 phút"},
            {"step": 3, "instruction": "Khuấy tôm, bí đỏ vào nồi cháo đun sôi kỹ 3 phút.", "duration": "3 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 25.0},
            {"name_en": "Shrimp", "weight_grams": 25.0},
            {"name_en": "Pumpkin", "weight_grams": 30.0}
        ]
    },
    {
        "name_vi": "Cháo gà cà rốt nhuyễn mềm",
        "name_en": "Chicken and Carrot Porridge",
        "description": "Bữa sáng ấm bụng nhẹ bụng dồi dào dinh dưỡng cho con dẻo dai.",
        "meal_type": "breakfast",
        "texture": "thin_porridge",
        "min_age_months": 10,
        "max_age_months": 16,
        "prep_time_min": 10,
        "allergens": [],
        "tags": ["dễ tiêu", "bổ dưỡng", "màu sắc"],
        "cooking_steps": [
            {"step": 1, "instruction": "Ức gà băm nhỏ xào thơm. Cà rốt bào mỏng băm nhỏ đem luộc mềm.", "duration": "8 phút"},
            {"step": 2, "instruction": "Cho gà và cà rốt vào đun với cháo vỡ sôi bùng trong 4 phút.", "duration": "4 phút"}
        ],
        "ingredients": [
            {"name_en": "Rice", "weight_grams": 25.0},
            {"name_en": "Chicken breast", "weight_grams": 30.0},
            {"name_en": "Carrot", "weight_grams": 20.0}
        ]
    }
]

def seed_data(db: Session):
    print("Starting database seeding process...")
    
    # 1. Seed Ingredients
    ingredient_instances = {}
    for ing_data in SEED_INGREDIENTS:
        # Check if already exists by english_name
        existing = db.query(Ingredient).filter(
            Ingredient.english_name.ilike(ing_data["english_name"])
        ).first()
        
        if not existing:
            ing = Ingredient(
                english_name=ing_data["english_name"],
                vietnamese_name=ing_data["vietnamese_name"],
                calories_kcal=ing_data["calories_kcal"],
                protein_g=ing_data["protein_g"],
                fat_g=ing_data["fat_g"],
                carbs_g=ing_data["carbs_g"],
                iron_mg=ing_data["iron_mg"],
                zinc_mg=ing_data["zinc_mg"],
                calcium_mg=ing_data["calcium_mg"],
                vitamin_c_mg=ing_data["vitamin_c_mg"],
                omega3_mg=ing_data["omega3_mg"],
                food_group=ing_data["food_group"],
                is_safe_baby=True,
                min_age_months=6
            )
            db.add(ing)
            db.commit()
            db.refresh(ing)
            print(f"Seeded ingredient: {ing.vietnamese_name} ({ing.english_name})")
            ingredient_instances[ing.english_name.lower()] = ing
        else:
            ingredient_instances[ing_data["english_name"].lower()] = existing

    # 2. Seed Recipes
    for rec_data in SEED_RECIPES:
        existing_recipe = db.query(Recipe).filter(
            Recipe.name_vi.ilike(rec_data["name_vi"])
        ).first()
        
        if existing_recipe:
            print(f"Recipe '{rec_data['name_vi']}' already exists. Skipping.")
            continue
            
        # Calculate totals
        total_cal = 0.0
        total_prot = 0.0
        total_fat = 0.0
        total_carbs = 0.0
        total_iron = 0.0
        total_zinc = 0.0
        total_omega3 = 0.0
        
        recipe_ing_relations = []
        for ing_item in rec_data["ingredients"]:
            ing_name = ing_item["name_en"].lower()
            weight = ing_item["weight_grams"]
            ing = ingredient_instances.get(ing_name)
            if not ing:
                print(f"Warning: Ingredient {ing_name} not found! Skipping recipe {rec_data['name_vi']}.")
                continue
                
            factor = weight / 100.0
            total_cal += ing.calories_kcal * factor
            total_prot += ing.protein_g * factor
            total_fat += ing.fat_g * factor
            total_carbs += ing.carbs_g * factor
            total_iron += ing.iron_mg * factor
            total_zinc += ing.zinc_mg * factor
            total_omega3 += ing.omega3_mg * factor
            
            recipe_ing_relations.append((ing.id, weight))
            
        recipe = Recipe(
            name_vi=rec_data["name_vi"],
            name_en=rec_data["name_en"],
            description=rec_data["description"],
            meal_type=rec_data["meal_type"],
            texture=rec_data["texture"],
            min_age_months=rec_data["min_age_months"],
            max_age_months=rec_data["max_age_months"],
            total_calories=total_cal,
            total_protein_g=total_prot,
            total_fat_g=total_fat,
            total_carbs_g=total_carbs,
            total_iron_mg=total_iron,
            total_zinc_mg=total_zinc,
            total_omega3_mg=total_omega3,
            servings=1,
            prep_time_min=rec_data["prep_time_min"],
            cooking_steps=rec_data["cooking_steps"],
            allergens=rec_data["allergens"],
            tags=rec_data["tags"],
            image_url=f"/images/recipes/{rec_data['name_en'].lower().replace(' ', '_')}.jpg"
        )
        db.add(recipe)
        db.commit()
        db.refresh(recipe)
        
        # Link ingredients
        for ing_id, w in recipe_ing_relations:
            ri = RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ing_id,
                weight_grams=w
            )
            db.add(ri)
            
        db.commit()
        print(f"Seeded recipe: {recipe.name_vi} ({len(recipe_ing_relations)} ingredients)")
        
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_data(db)
    finally:
        db.close()
