import random
from sqlalchemy.orm import Session
from models.baby_profile import BabyProfile
from models.recipe import Recipe
from services.who_nutrition_goals import get_daily_goals
from schemas import DailyMenu, WeeklyMenu, RecipeResponse, IngredientResponse, RecipeIngredientResponse

TEXTURE_MAP = {
    (6, 8): "puree",
    (9, 11): "thin_porridge",
    (12, 18): "thick_porridge",
    (19, 24): "soft_solid"
}

def get_texture_for_age(age: int) -> str:
    for (min_a, max_a), tex in TEXTURE_MAP.items():
        if min_a <= age <= max_a:
            return tex
    if age < 6:
        return "puree"
    return "soft_solid"

def to_recipe_response(recipe: Recipe) -> RecipeResponse:
    # Convert SQLAlchemy model to Pydantic schema
    ingredients_list = []
    for ri in recipe.ingredients:
        ing = ri.ingredient
        ingredients_list.append(RecipeIngredientResponse(
            ingredient=IngredientResponse.model_validate(ing),
            weight_grams=ri.weight_grams
        ))
    
    return RecipeResponse(
        id=recipe.id,
        name_vi=recipe.name_vi,
        name_en=recipe.name_en,
        description=recipe.description,
        meal_type=recipe.meal_type,
        texture=recipe.texture,
        min_age_months=recipe.min_age_months,
        max_age_months=recipe.max_age_months,
        total_calories=recipe.total_calories,
        total_protein_g=recipe.total_protein_g,
        total_fat_g=recipe.total_fat_g,
        total_carbs_g=recipe.total_carbs_g,
        total_iron_mg=recipe.total_iron_mg,
        total_zinc_mg=recipe.total_zinc_mg,
        total_omega3_mg=recipe.total_omega3_mg,
        servings=recipe.servings,
        prep_time_min=recipe.prep_time_min,
        cooking_steps=recipe.cooking_steps,
        allergens=recipe.allergens,
        tags=recipe.tags,
        image_url=recipe.image_url,
        ingredients=ingredients_list
    )

def recommend_daily_menu(
    baby: BabyProfile, 
    db: Session, 
    seen_ids: dict[str, set[int]] = None
) -> DailyMenu:
    if seen_ids is None:
        seen_ids = {"breakfast": set(), "lunch": set(), "dinner": set(), "snack": set()}

    age = baby.age_months
    texture = get_texture_for_age(age)
    goals = get_daily_goals(age, baby.current_weight_kg)

    # 1. Fetch recipes safe for age
    all_recipes = db.query(Recipe).filter(
        Recipe.min_age_months <= age,
        Recipe.max_age_months >= age
    ).all()

    # 2. Filter out allergens case-insensitively
    baby_allergies = [a.lower() for a in (baby.allergies or [])]
    safe_recipes = []
    for r in all_recipes:
        r_allergens = [a.lower() for a in (r.allergens or [])]
        if not any(a in r_allergens for a in baby_allergies):
            safe_recipes.append(r)

    # 3. Group by meal_type
    buckets = {
        "breakfast": [],
        "lunch": [],
        "dinner": [],
        "snack": []
    }
    for r in safe_recipes:
        mtype = r.meal_type.lower()
        if mtype in buckets:
            buckets[mtype].append(r)

    # 4. Selection helper with variety tracking
    selected_meals = {}
    for slot in ["breakfast", "lunch", "dinner", "snack"]:
        candidates = buckets[slot]
        # Try to filter by texture first
        texture_candidates = [c for c in candidates if c.texture.lower() == texture.lower()]
        slot_candidates = texture_candidates if texture_candidates else candidates

        if not slot_candidates:
            # Fallback to any safe recipe of this slot if no texture-matching exists
            slot_candidates = candidates

        if not slot_candidates:
            # Absolute fallback: if no recipes in slot at all, fetch any safe recipe in database
            fallback_recipes = db.query(Recipe).filter(Recipe.meal_type == slot).all()
            slot_candidates = [r for r in fallback_recipes if not any(a.lower() in [al.lower() for al in (r.allergens or [])] for a in baby_allergies)]
            if not slot_candidates:
                slot_candidates = fallback_recipes

        # Variety check: filter out seen IDs
        unseen_candidates = [c for c in slot_candidates if c.id not in seen_ids.get(slot, set())]
        final_pool = unseen_candidates if unseen_candidates else slot_candidates

        if final_pool:
            chosen = random.choice(final_pool)
            selected_meals[slot] = chosen
            seen_ids.setdefault(slot, set()).add(chosen.id)
        else:
            selected_meals[slot] = None

    # 5. Compute nutrition totals
    def calculate_totals(meals_dict):
        totals = {
            "calories": 0.0,
            "protein_g": 0.0,
            "fat_g": 0.0,
            "carbs_g": 0.0,
            "iron_mg": 0.0,
            "zinc_mg": 0.0,
            "omega3_mg": 0.0
        }
        for m in meals_dict.values():
            if m:
                totals["calories"] += m.total_calories
                totals["protein_g"] += m.total_protein_g
                totals["fat_g"] += m.total_fat_g
                totals["carbs_g"] += m.total_carbs_g
                totals["iron_mg"] += m.total_iron_mg
                totals["zinc_mg"] += m.total_zinc_mg
                totals["omega3_mg"] += m.total_omega3_mg
        return totals

    totals = calculate_totals(selected_meals)

    # 6. Check coverage & meets_80pct
    def calculate_coverage(totals_dict):
        return {
            "calories": (totals_dict["calories"] / goals.calories * 100) if goals.calories > 0 else 100.0,
            "protein_g": (totals_dict["protein_g"] / goals.protein_g * 100) if goals.protein_g > 0 else 100.0,
            "fat_g": (totals_dict["fat_g"] / goals.fat_g * 100) if goals.fat_g > 0 else 100.0,
            "carbs_g": (totals_dict["carbs_g"] / (goals.calories * 0.5 / 4.0) * 100) if goals.calories > 0 else 100.0, # estimate carbs goal as 50% calories
        }

    coverage = calculate_coverage(totals)
    meets_80pct = all(v >= 80.0 for v in coverage.values())

    # 7. Greedy supplementary snack addition
    if not meets_80pct:
        # Find deficient macros
        deficient_macros = [k for k, v in coverage.items() if v < 80.0]
        if deficient_macros:
            # Find the most deficient macro
            worst_macro = min(deficient_macros, key=lambda m: coverage[m])
            
            # Find a supplementary snack that is high in that macro
            snack_candidates = buckets["snack"]
            if snack_candidates:
                # Sort descending by that nutrient
                if worst_macro == "calories":
                    snack_candidates.sort(key=lambda s: s.total_calories, reverse=True)
                elif worst_macro == "protein_g":
                    snack_candidates.sort(key=lambda s: s.total_protein_g, reverse=True)
                elif worst_macro == "fat_g":
                    snack_candidates.sort(key=lambda s: s.total_fat_g, reverse=True)
                elif worst_macro == "carbs_g":
                    snack_candidates.sort(key=lambda s: s.total_carbs_g, reverse=True)

                # Filter out the snack already selected if possible to ensure variety
                chosen_snack = selected_meals.get("snack")
                best_supp_snack = None
                for s in snack_candidates:
                    if chosen_snack is None or s.id != chosen_snack.id:
                        best_supp_snack = s
                        break
                if not best_supp_snack:
                    best_supp_snack = snack_candidates[0]

                selected_meals["supplementary_snack"] = best_supp_snack
                # Recalculate totals
                totals = calculate_totals(selected_meals)
                coverage = calculate_coverage(totals)
                meets_80pct = all(v >= 80.0 for v in coverage.values())

    # Map selected meals to RecipeResponse
    meals_response = {}
    for key, val in selected_meals.items():
        if val:
            meals_response[key] = to_recipe_response(val)

    return DailyMenu(
        meals=meals_response,
        nutrition_totals=totals,
        coverage_pct=coverage,
        meets_80pct=meets_80pct
    )

def recommend_weekly_menu(baby: BabyProfile, db: Session) -> WeeklyMenu:
    days_menu = []
    # Initialize seen tracking dict per day-slot to force daily variety
    seen_ids = {"breakfast": set(), "lunch": set(), "dinner": set(), "snack": set()}
    
    for _ in range(7):
        daily = recommend_daily_menu(baby, db, seen_ids)
        days_menu.append(daily)
        
    return WeeklyMenu(days=days_menu)
