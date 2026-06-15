from schemas import DailyGoals

WHO_GOALS = {
    (0,  5): {"calories": 550.0,  "protein_g": 9.1,  "iron_mg": 0.27, "fat_g": 31.0},
    (6,  8): {"calories": 615.0,  "protein_g": 11.0, "iron_mg": 11.0, "fat_g": 30.0},
    (9, 11): {"calories": 686.0,  "protein_g": 14.0, "iron_mg": 11.0, "fat_g": 30.0},
    (12, 23): {"calories": 894.0,  "protein_g": 13.0, "iron_mg": 7.0,  "fat_g": 25.0},
    (24, 35): {"calories": 1000.0, "protein_g": 13.0, "iron_mg": 7.0,  "fat_g": 25.0},
}

def get_daily_goals(age_months: int, weight_kg: float | None) -> DailyGoals:
    """
    Retrieves the WHO 2023 recommended daily nutrient intakes based on baby age in months,
    scaling calorie requirements if weight is available for infants under 12 months.
    """
    if age_months < 0:
        age_months = 0

    matched_goals = None
    for (min_age, max_age), goals in WHO_GOALS.items():
        if min_age <= age_months <= max_age:
            matched_goals = goals.copy()
            break

    if matched_goals is None:
        # Default to highest age group if age is 36 months or older
        matched_goals = WHO_GOALS[(24, 35)].copy()

    # Scale calories by weight for infants under 1 year old (calories = weight_kg * 90 kcal/kg)
    if weight_kg is not None and weight_kg > 0.0 and age_months < 12:
        matched_goals["calories"] = float(weight_kg * 90.0)

    return DailyGoals(
        calories=float(matched_goals["calories"]),
        protein_g=float(matched_goals["protein_g"]),
        iron_mg=float(matched_goals["iron_mg"]),
        fat_g=float(matched_goals["fat_g"])
    )
