import os
import httpx
import asyncio
from sqlalchemy.orm import Session
from schemas import NutrientData, IngestionResult
from models.ingredient import Ingredient

USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")

USDA_VN_MAP = {
    "Sweet potato": "Khoai lang",
    "Salmon": "Cá hồi",
    "Chicken breast": "Ức gà",
    "Beef": "Thịt bò",
    "Pumpkin": "Bí đỏ",
    "Spinach": "Rau bina",
    "Rice": "Gạo tẻ",
    "Carrot": "Cà rốt",
    "Broccoli": "Bông cải xanh",
    "Egg yolk": "Lòng đỏ trứng",
    "Avocado": "Bơ",
    "Banana": "Chuối",
    "Apple": "Táo",
    "Tofu": "Đậu phụ",
    "Cod": "Cá tuyết",
    "Tuna": "Cá ngừ",
    "Chicken liver": "Gan gà",
    "Oats": "Yến mạch",
    "Lentils": "Đậu lăng",
    "Mango": "Xoài",
    "Pork": "Thịt heo",
    "Shrimp": "Tôm",
    "Clam": "Nghêu",
    "Oyster": "Hàu",
    "Watercress": "Rau cải xoong",
    "Bitter melon": "Khổ qua",
    "Lotus root": "Củ sen"
}

NUTRIENT_IDS = {
    1008: "calories_kcal", 
    1003: "protein_g", 
    1004: "fat_g", 
    1005: "carbs_g",
    1089: "iron_mg", 
    1095: "zinc_mg", 
    1087: "calcium_mg", 
    1162: "vitamin_c_mg",
    1404: "omega3_mg"
}

def determine_food_group(name_en: str) -> str:
    name_lower = name_en.lower()
    if any(k in name_lower for k in ["chicken", "beef", "pork", "liver", "meat"]):
        return "Thịt"
    if any(k in name_lower for k in ["salmon", "cod", "tuna", "shrimp", "clam", "oyster", "fish", "seafood"]):
        return "Cá"
    if any(k in name_lower for k in ["potato", "pumpkin", "spinach", "carrot", "broccoli", "watercress", "bitter melon", "lotus root", "vegetable"]):
        return "Rau củ"
    if any(k in name_lower for k in ["rice", "oats", "lentils", "grain"]):
        return "Ngũ cốc"
    if any(k in name_lower for k in ["egg", "milk", "cheese", "yogurt", "butter"]):
        return "Trứng/Sữa"
    return "Khác"

async def fetch_usda_nutrients(food_name_en: str) -> NutrientData | None:
    # Match english_name to vietnamese_name case-insensitively
    vn_name = None
    for en_key, vn_val in USDA_VN_MAP.items():
        if en_key.lower() == food_name_en.lower():
            vn_name = vn_val
            break
    if not vn_name:
        vn_name = food_name_en

    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    params = {
        "query": food_name_en,
        "dataType": ["Foundation", "SR Legacy"],
        "pageSize": 1,
        "api_key": USDA_API_KEY
    }

    backoff = 2.0
    async with httpx.AsyncClient(timeout=15.0) as client:
        for attempt in range(4):
            try:
                response = await client.get(url, params=params)
                if response.status_code == 429:
                    # Rate limited: wait and retry
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                response.raise_for_status()
                data = response.json()
                break
            except Exception:
                if attempt == 3:
                    return None
                await asyncio.sleep(backoff)
                backoff *= 2
        else:
            return None

    foods = data.get("foods", [])
    if not foods:
        return None

    food = foods[0]
    fdc_id = food.get("fdcId")
    
    # Initialize all mapped nutrients to 0.0
    nutrients = {field: 0.0 for field in NUTRIENT_IDS.values()}
    
    for nut in food.get("foodNutrients", []):
        n_id = nut.get("nutrientId")
        if n_id in NUTRIENT_IDS:
            field = NUTRIENT_IDS[n_id]
            nutrients[field] = float(nut.get("value", 0.0))

    return NutrientData(
        usda_fdc_id=fdc_id,
        english_name=food_name_en,
        vietnamese_name=vn_name,
        **nutrients
    )

async def bulk_ingest_ingredients(food_list: list[str], db: Session) -> list[IngestionResult]:
    results = []
    for food in food_list:
        try:
            # Query USDA API
            nutrient_data = await fetch_usda_nutrients(food)
            if not nutrient_data:
                results.append(IngestionResult(food=food, status="failed"))
                continue

            # Check if ingredient already exists in DB
            db_ingredient = None
            if nutrient_data.usda_fdc_id:
                db_ingredient = db.query(Ingredient).filter(
                    Ingredient.usda_fdc_id == nutrient_data.usda_fdc_id
                ).first()

            if not db_ingredient:
                db_ingredient = db.query(Ingredient).filter(
                    Ingredient.english_name.ilike(food)
                ).first()

            group = determine_food_group(food)
            
            # Map Pydantic nutrient fields to SQLAlchemy Ingredient model
            if db_ingredient:
                db_ingredient.english_name = nutrient_data.english_name
                db_ingredient.vietnamese_name = nutrient_data.vietnamese_name
                db_ingredient.calories_kcal = nutrient_data.calories_kcal
                db_ingredient.protein_g = nutrient_data.protein_g
                db_ingredient.fat_g = nutrient_data.fat_g
                db_ingredient.carbs_g = nutrient_data.carbs_g
                db_ingredient.iron_mg = nutrient_data.iron_mg
                db_ingredient.zinc_mg = nutrient_data.zinc_mg
                db_ingredient.calcium_mg = nutrient_data.calcium_mg
                db_ingredient.vitamin_c_mg = nutrient_data.vitamin_c_mg
                db_ingredient.omega3_mg = nutrient_data.omega3_mg
                db_ingredient.food_group = group
            else:
                db_ingredient = Ingredient(
                    usda_fdc_id=nutrient_data.usda_fdc_id,
                    english_name=nutrient_data.english_name,
                    vietnamese_name=nutrient_data.vietnamese_name,
                    calories_kcal=nutrient_data.calories_kcal,
                    protein_g=nutrient_data.protein_g,
                    fat_g=nutrient_data.fat_g,
                    carbs_g=nutrient_data.carbs_g,
                    iron_mg=nutrient_data.iron_mg,
                    zinc_mg=nutrient_data.zinc_mg,
                    calcium_mg=nutrient_data.calcium_mg,
                    vitamin_c_mg=nutrient_data.vitamin_c_mg,
                    omega3_mg=nutrient_data.omega3_mg,
                    food_group=group,
                    is_safe_baby=True,
                    min_age_months=6
                )
                db.add(db_ingredient)

            db.commit()
            db.refresh(db_ingredient)
            
            results.append(IngestionResult(food=food, status="success", data=nutrient_data))
        except Exception:
            db.rollback()
            results.append(IngestionResult(food=food, status="failed"))

        # Yield control slightly between requests to maintain rate compliance
        await asyncio.sleep(0.5)

    return results
