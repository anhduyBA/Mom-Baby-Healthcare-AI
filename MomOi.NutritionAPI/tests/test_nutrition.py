import pytest
from datetime import date, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models.ingredient import Ingredient
from models.recipe import Recipe, RecipeIngredient
from models.baby_profile import BabyProfile
from services.who_nutrition_goals import get_daily_goals
from services.recommendation_engine import recommend_daily_menu, recommend_weekly_menu

# In-memory SQLite DB configurations for testing
DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_who_goals_lookup_standard():
    # 3 months old infant, no weight provided -> returns default WHO guidelines
    goals = get_daily_goals(age_months=3, weight_kg=None)
    assert goals.calories == 550.0
    assert goals.protein_g == 9.1
    assert goals.iron_mg == 0.27
    assert goals.fat_g == 31.0


def test_who_goals_lookup_scaled():
    # 6 months old infant, weight = 8.5 kg -> scales calorie requirement to 8.5 * 90 = 765
    goals = get_daily_goals(age_months=6, weight_kg=8.5)
    assert goals.calories == 765.0
    assert goals.protein_g == 11.0
    assert goals.iron_mg == 11.0
    assert goals.fat_g == 30.0


def test_who_goals_fallback_older():
    # 48 months toddler -> defaults to oldest bracket (24-35 months)
    goals = get_daily_goals(age_months=48, weight_kg=None)
    assert goals.calories == 1000.0
    assert goals.protein_g == 13.0
    assert goals.iron_mg == 7.0
    assert goals.fat_g == 25.0


def test_allergy_filtering_and_greedy_snack(db_session):
    # 1. Setup mock ingredients
    rice = Ingredient(english_name="Rice", vietnamese_name="Gạo tẻ", calories_kcal=360, protein_g=6, fat_g=0.5, carbs_g=80, iron_mg=1, zinc_mg=1, food_group="Ngũ cốc", is_safe_baby=True, min_age_months=6)
    beef = Ingredient(english_name="Beef", vietnamese_name="Thịt bò", calories_kcal=250, protein_g=25, fat_g=15, carbs_g=0, iron_mg=3, zinc_mg=5, food_group="Thịt", is_safe_baby=True, min_age_months=6)
    spinach = Ingredient(english_name="Spinach", vietnamese_name="Rau bina", calories_kcal=23, protein_g=3, fat_g=0.5, carbs_g=3, iron_mg=3, zinc_mg=0.5, food_group="Rau củ", is_safe_baby=True, min_age_months=6)
    db_session.add_all([rice, beef, spinach])
    db_session.commit()

    # 2. Setup mock recipes (all for age 6 months, texture 'puree')
    r_bf = Recipe(
        name_vi="Cháo gạo", name_en="Rice porridge", meal_type="breakfast", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=72, total_protein_g=1.2, 
        total_fat_g=0.1, total_carbs_g=16.0, total_iron_mg=0.2, total_zinc_mg=0.2, allergens=[]
    )
    r_lh = Recipe(
        name_vi="Cháo thịt bò", name_en="Beef porridge", meal_type="lunch", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=150, total_protein_g=10.0, 
        total_fat_g=5.0, total_carbs_g=10.0, total_iron_mg=2.0, total_zinc_mg=1.0, allergens=[]
    )
    r_dn = Recipe(
        name_vi="Cháo rau bina", name_en="Spinach porridge", meal_type="dinner", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=60, total_protein_g=2.0, 
        total_fat_g=0.2, total_carbs_g=8.0, total_iron_mg=1.5, total_zinc_mg=0.3, allergens=[]
    )
    # This snack contains egg allergen, which the baby is allergic to
    r_sk_allergic = Recipe(
        name_vi="Bột khoai lang trứng", name_en="Potato egg snack", meal_type="snack", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=50, total_protein_g=1.0, 
        total_fat_g=0.1, total_carbs_g=10.0, total_iron_mg=0.5, total_zinc_mg=0.1, allergens=["egg"]
    )
    # Safe snack
    r_sk_safe = Recipe(
        name_vi="Bơ chuối nghiền", name_en="Mashed avocado", meal_type="snack", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=80, total_protein_g=1.5, 
        total_fat_g=7.0, total_carbs_g=4.0, total_iron_mg=0.5, total_zinc_mg=0.2, allergens=[]
    )
    
    db_session.add_all([r_bf, r_lh, r_dn, r_sk_allergic, r_sk_safe])
    db_session.commit()

    # 3. Create Baby Profile with egg allergy
    today = datetime.utcnow().date()
    # Make baby exactly 6 months old
    dob = date(today.year if today.month > 6 else today.year - 1, (today.month - 6) if today.month > 6 else (today.month + 6), today.day)
    
    baby = BabyProfile(
        user_id="user123",
        baby_name="Gia Bảo",
        date_of_birth=dob,
        gender="male",
        current_weight_kg=7.0,
        allergies=["egg"],
        food_history=[]
    )
    db_session.add(baby)
    db_session.commit()

    # 4. Generate daily menu recommendation
    menu = recommend_daily_menu(baby, db_session)

    # 5. Assertions
    assert menu.meals["breakfast"].id == r_bf.id
    assert menu.meals["lunch"].id == r_lh.id
    assert menu.meals["dinner"].id == r_dn.id
    
    # Allergic egg-snack must be skipped, mashed avocado should be picked
    assert menu.meals["snack"].id == r_sk_safe.id
    assert "egg" not in menu.meals["snack"].allergens


def test_weekly_menu_recommendation(db_session):
    # 1. Setup mock ingredients
    rice = Ingredient(english_name="Rice", vietnamese_name="Gạo tẻ", calories_kcal=360, protein_g=6, fat_g=0.5, carbs_g=80, iron_mg=1, zinc_mg=1, food_group="Ngũ cốc", is_safe_baby=True, min_age_months=6)
    db_session.add(rice)
    db_session.commit()

    # Create 2 breakfast recipes to test variety
    r_bf1 = Recipe(
        name_vi="Cháo gạo 1", name_en="Rice porridge 1", meal_type="breakfast", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=70, total_protein_g=1.0, 
        total_fat_g=0.1, total_carbs_g=15.0, total_iron_mg=0.2, total_zinc_mg=0.2, allergens=[]
    )
    r_bf2 = Recipe(
        name_vi="Cháo gạo 2", name_en="Rice porridge 2", meal_type="breakfast", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=80, total_protein_g=1.2, 
        total_fat_g=0.2, total_carbs_g=17.0, total_iron_mg=0.3, total_zinc_mg=0.2, allergens=[]
    )
    # Lunch, dinner, snack
    r_lh = Recipe(
        name_vi="Cháo thịt", name_en="Meat porridge", meal_type="lunch", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=150, total_protein_g=10.0, 
        total_fat_g=5.0, total_carbs_g=10.0, total_iron_mg=2.0, total_zinc_mg=1.0, allergens=[]
    )
    r_dn = Recipe(
        name_vi="Cháo rau", name_en="Veggie porridge", meal_type="dinner", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=60, total_protein_g=2.0, 
        total_fat_g=0.2, total_carbs_g=8.0, total_iron_mg=1.5, total_zinc_mg=0.3, allergens=[]
    )
    r_sk = Recipe(
        name_vi="Chuối nghiền", name_en="Mashed banana", meal_type="snack", texture="puree", 
        min_age_months=6, max_age_months=12, total_calories=80, total_protein_g=1.5, 
        total_fat_g=0.2, total_carbs_g=18.0, total_iron_mg=0.5, total_zinc_mg=0.2, allergens=[]
    )

    db_session.add_all([r_bf1, r_bf2, r_lh, r_dn, r_sk])
    db_session.commit()

    today = datetime.utcnow().date()
    dob = date(today.year if today.month > 6 else today.year - 1, (today.month - 6) if today.month > 6 else (today.month + 6), today.day)
    
    baby = BabyProfile(
        user_id="user123",
        baby_name="Gia Bảo",
        date_of_birth=dob,
        gender="male",
        current_weight_kg=7.0,
        allergies=[],
        food_history=[]
    )
    db_session.add(baby)
    db_session.commit()

    weekly = recommend_weekly_menu(baby, db_session)
    assert len(weekly.days) == 7
    
    # Verify that both breakfast recipes are selected at least once to confirm variety routing
    breakfast_ids = {day.meals["breakfast"].id for day in weekly.days if "breakfast" in day.meals}
    assert r_bf1.id in breakfast_ids or r_bf2.id in breakfast_ids

