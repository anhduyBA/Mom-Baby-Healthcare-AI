import os
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables from parent folder .env
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from database import engine, SessionLocal, Base, get_db
from models.ingredient import Ingredient
from models.recipe import Recipe, RecipeIngredient
from models.baby_profile import BabyProfile
from schemas import (
    NutrientData, IngestionRequest, IngestionResult,
    BabyProfileCreate, BabyProfileUpdate, BabyProfileResponse,
    RecipeCreate, RecipeResponse, RecipeNutrition, DailyGoals,
    DailyMenu, WeeklyMenu
)
from services.usda_service import fetch_usda_nutrients, bulk_ingest_ingredients
from services.who_nutrition_goals import get_daily_goals
from services.recommendation_engine import recommend_daily_menu, recommend_weekly_menu, to_recipe_response
from services.pregnancy_nutrition_service import get_ai_pregnancy_meal_plan

app = FastAPI(
    title="Mom Ơi! Nutrition API",
    description="Microservice managing USDA nutrition ingestion, recipes, and WHO-compliant greedy baby meal recommendations.",
    version="1.0.0"
)

# CORS Middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event triggers table creation and automatic seeding if empty
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Ingredient).count() == 0:
            from seed.seed_recipes import seed_data
            seed_data(db)
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()


# --- USDA Endpoints ---

@app.post("/api/nutrition/ingest", response_model=List[IngestionResult])
async def ingest_ingredients(request: IngestionRequest, db: Session = Depends(get_db)):
    results = await bulk_ingest_ingredients(request.food_names_en, db)
    return results

@app.get("/api/nutrition/ingredient/{name_en}", response_model=NutrientData)
async def get_ingredient_usda_live(name_en: str):
    data = await fetch_usda_nutrients(name_en)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingredient '{name_en}' not found in USDA Database."
        )
    return data


# --- Baby Profile Endpoints ---

@app.post("/api/baby/profile", response_model=BabyProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_baby_profile(profile_in: BabyProfileCreate, db: Session = Depends(get_db)):
    # Calculate age in months
    today = datetime.utcnow().date()
    dob = profile_in.date_of_birth
    years_diff = today.year - dob.year
    months_diff = today.month - dob.month
    age = years_diff * 12 + months_diff
    if today.day < dob.day:
        age -= 1
    age = max(0, age)

    # Compute WHO daily nutrition targets
    goals = get_daily_goals(age, profile_in.current_weight_kg)

    growth = []
    if profile_in.current_weight_kg is not None or profile_in.current_height_cm is not None:
        growth.append({
            "date": today.isoformat(),
            "weight_kg": profile_in.current_weight_kg,
            "height_cm": profile_in.current_height_cm
        })

    db_profile = BabyProfile(
        user_id=profile_in.user_id,
        baby_name=profile_in.baby_name,
        date_of_birth=profile_in.date_of_birth,
        gender=profile_in.gender,
        current_weight_kg=profile_in.current_weight_kg,
        current_height_cm=profile_in.current_height_cm,
        daily_calories_goal=goals.calories,
        daily_protein_goal=goals.protein_g,
        daily_iron_goal=goals.iron_mg,
        allergies=profile_in.allergies,
        food_history=profile_in.food_history,
        growth_records=growth
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@app.patch("/api/baby/profile/{baby_id}", response_model=BabyProfileResponse)
async def update_baby_profile(baby_id: int, profile_in: BabyProfileUpdate, db: Session = Depends(get_db)):
    profile = db.query(BabyProfile).filter(BabyProfile.id == baby_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baby profile with ID {baby_id} not found."
        )

    update_data = profile_in.model_dump(exclude_unset=True)
    
    # Track if weight, height, or DOB changed to update growth records and WHO goals
    weight_changed = "current_weight_kg" in update_data
    height_changed = "current_height_cm" in update_data

    for field, val in update_data.items():
        setattr(profile, field, val)

    # Append to growth records if updated
    if weight_changed or height_changed:
        today = datetime.utcnow().date().isoformat()
        records = list(profile.growth_records or [])
        records.append({
            "date": today,
            "weight_kg": profile.current_weight_kg,
            "height_cm": profile.current_height_cm
        })
        profile.growth_records = records

    # Recalculate targets based on updated age and weight
    age = profile.age_months
    goals = get_daily_goals(age, profile.current_weight_kg)
    profile.daily_calories_goal = goals.calories
    profile.daily_protein_goal = goals.protein_g
    profile.daily_iron_goal = goals.iron_mg

    db.commit()
    db.refresh(profile)
    return profile


# --- Recommendation Endpoints ---

@app.get("/api/baby/{baby_id}/menu/daily", response_model=DailyMenu)
async def get_daily_menu(baby_id: int, db: Session = Depends(get_db)):
    baby = db.query(BabyProfile).filter(BabyProfile.id == baby_id).first()
    if not baby:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baby profile with ID {baby_id} not found."
        )
    return recommend_daily_menu(baby, db)

@app.get("/api/baby/{baby_id}/menu/weekly", response_model=WeeklyMenu)
async def get_weekly_menu(baby_id: int, db: Session = Depends(get_db)):
    baby = db.query(BabyProfile).filter(BabyProfile.id == baby_id).first()
    if not baby:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baby profile with ID {baby_id} not found."
        )
    return recommend_weekly_menu(baby, db)

@app.get("/api/baby/{baby_id}/nutrition/goals", response_model=DailyGoals)
async def get_baby_nutrition_goals(baby_id: int, db: Session = Depends(get_db)):
    baby = db.query(BabyProfile).filter(BabyProfile.id == baby_id).first()
    if not baby:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Baby profile with ID {baby_id} not found."
        )
    return DailyGoals(
        calories=baby.daily_calories_goal,
        protein_g=baby.daily_protein_goal,
        iron_mg=baby.daily_iron_goal,
        fat_g=get_daily_goals(baby.age_months, baby.current_weight_kg).fat_g
    )

@app.get("/api/nutrition/meal-plan")
async def get_pregnancy_meal_plan_endpoint(week: int = Query(12)):
    """
    Get a 7-day maternal meal plan for the given pregnancy week.
    Generates plan using Google Gemini AI, or returns a high-quality local fallback plan.
    """
    plan = await get_ai_pregnancy_meal_plan(week)
    return plan


# --- Recipe Endpoints ---

@app.post("/api/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(recipe_in: RecipeCreate, db: Session = Depends(get_db)):
    # 1. Resolve ingredients and calculate totals
    total_cal = 0.0
    total_prot = 0.0
    total_fat = 0.0
    total_carbs = 0.0
    total_iron = 0.0
    total_zinc = 0.0
    total_omega3 = 0.0

    resolved_ingredients = []

    for item in recipe_in.ingredients:
        db_ingredient = None
        if item.ingredient_id:
            db_ingredient = db.query(Ingredient).filter(Ingredient.id == item.ingredient_id).first()
        elif item.name_en:
            db_ingredient = db.query(Ingredient).filter(Ingredient.english_name.ilike(item.name_en)).first()
            if not db_ingredient:
                # Live fetch & ingest as fallback
                live_data = await fetch_usda_nutrients(item.name_en)
                if live_data:
                    from services.usda_service import determine_food_group
                    db_ingredient = Ingredient(
                        usda_fdc_id=live_data.usda_fdc_id,
                        english_name=live_data.english_name,
                        vietnamese_name=live_data.vietnamese_name,
                        calories_kcal=live_data.calories_kcal,
                        protein_g=live_data.protein_g,
                        fat_g=live_data.fat_g,
                        carbs_g=live_data.carbs_g,
                        iron_mg=live_data.iron_mg,
                        zinc_mg=live_data.zinc_mg,
                        calcium_mg=live_data.calcium_mg,
                        vitamin_c_mg=live_data.vitamin_c_mg,
                        omega3_mg=live_data.omega3_mg,
                        food_group=determine_food_group(item.name_en),
                        is_safe_baby=True,
                        min_age_months=6
                    )
                    db.add(db_ingredient)
                    db.commit()
                    db.refresh(db_ingredient)

        if not db_ingredient:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ingredient references (id: {item.ingredient_id}, name: {item.name_en}) cannot be resolved."
            )

        factor = item.weight_grams / 100.0
        total_cal += db_ingredient.calories_kcal * factor
        total_prot += db_ingredient.protein_g * factor
        total_fat += db_ingredient.fat_g * factor
        total_carbs += db_ingredient.carbs_g * factor
        total_iron += db_ingredient.iron_mg * factor
        total_zinc += db_ingredient.zinc_mg * factor
        total_omega3 += db_ingredient.omega3_mg * factor

        resolved_ingredients.append((db_ingredient.id, item.weight_grams))

    # 2. Save Recipe
    recipe = Recipe(
        name_vi=recipe_in.name_vi,
        name_en=recipe_in.name_en,
        description=recipe_in.description,
        meal_type=recipe_in.meal_type,
        texture=recipe_in.texture,
        min_age_months=recipe_in.min_age_months,
        max_age_months=recipe_in.max_age_months,
        total_calories=total_cal,
        total_protein_g=total_prot,
        total_fat_g=total_fat,
        total_carbs_g=total_carbs,
        total_iron_mg=total_iron,
        total_zinc_mg=total_zinc,
        total_omega3_mg=total_omega3,
        servings=recipe_in.servings,
        prep_time_min=recipe_in.prep_time_min,
        cooking_steps=recipe_in.cooking_steps,
        allergens=recipe_in.allergens,
        tags=recipe_in.tags,
        image_url=recipe_in.image_url
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)

    # 3. Save Recipe Ingredients
    for ing_id, w in resolved_ingredients:
        ri = RecipeIngredient(
            recipe_id=recipe.id,
            ingredient_id=ing_id,
            weight_grams=w
        )
        db.add(ri)
    db.commit()
    db.refresh(recipe)

    return to_recipe_response(recipe)

@app.post("/api/recipes/{recipe_id}/recalculate", response_model=RecipeNutrition)
async def recalculate_recipe_nutrition(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recipe with ID {recipe_id} not found."
        )

    total_cal = 0.0
    total_prot = 0.0
    total_fat = 0.0
    total_carbs = 0.0
    total_iron = 0.0
    total_zinc = 0.0
    total_omega3 = 0.0

    for ri in recipe.ingredients:
        ing = ri.ingredient
        factor = ri.weight_grams / 100.0
        total_cal += ing.calories_kcal * factor
        total_prot += ing.protein_g * factor
        total_fat += ing.fat_g * factor
        total_carbs += ing.carbs_g * factor
        total_iron += ing.iron_mg * factor
        total_zinc += ing.zinc_mg * factor
        total_omega3 += ing.omega3_mg * factor

    recipe.total_calories = total_cal
    recipe.total_protein_g = total_prot
    recipe.total_fat_g = total_fat
    recipe.total_carbs_g = total_carbs
    recipe.total_iron_mg = total_iron
    recipe.total_zinc_mg = total_zinc
    recipe.total_omega3_mg = total_omega3

    db.commit()
    db.refresh(recipe)

    return RecipeNutrition(
        recipe_id=recipe.id,
        total_calories=recipe.total_calories,
        total_protein_g=recipe.total_protein_g,
        total_fat_g=recipe.total_fat_g,
        total_carbs_g=recipe.total_carbs_g,
        total_iron_mg=recipe.total_iron_mg,
        total_zinc_mg=recipe.total_zinc_mg,
        total_omega3_mg=recipe.total_omega3_mg
    )

@app.get("/api/recipes", response_model=List[RecipeResponse])
async def get_recipes(
    age_months: Optional[int] = Query(None),
    texture: Optional[str] = Query(None),
    allergen_exclude: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Recipe)
    
    if age_months is not None:
        query = query.filter(Recipe.min_age_months <= age_months, Recipe.max_age_months >= age_months)
        
    if texture is not None:
        query = query.filter(Recipe.texture == texture)
        
    recipes = query.all()
    
    if allergen_exclude:
        excludes = [a.strip().lower() for a in allergen_exclude.split(",") if a.strip()]
        filtered = []
        for r in recipes:
            r_allergens = [al.lower() for al in (r.allergens or [])]
            if not any(e in r_allergens for e in excludes):
                filtered.append(r)
        recipes = filtered

    return [to_recipe_response(r) for r in recipes]
