from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Dict, Optional, Any

# --- Nutrient & Ingestion Schemas ---
class NutrientData(BaseModel):
    usda_fdc_id: Optional[int] = None
    english_name: str
    vietnamese_name: str
    calories_kcal: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbs_g: float = 0.0
    iron_mg: float = 0.0
    zinc_mg: float = 0.0
    calcium_mg: float = 0.0
    vitamin_c_mg: float = 0.0
    omega3_mg: float = 0.0

class IngestionRequest(BaseModel):
    food_names_en: List[str]

class IngestionResult(BaseModel):
    food: str
    status: str  # "success" | "failed"
    data: Optional[NutrientData] = None

# --- Baby Profile Schemas ---
class BabyProfileCreate(BaseModel):
    user_id: str
    baby_name: str
    date_of_birth: date
    gender: str  # "male" | "female"
    current_weight_kg: Optional[float] = None
    current_height_cm: Optional[float] = None
    allergies: List[str] = Field(default_factory=list)
    food_history: List[str] = Field(default_factory=list)

class BabyProfileUpdate(BaseModel):
    baby_name: Optional[str] = None
    gender: Optional[str] = None
    current_weight_kg: Optional[float] = None
    current_height_cm: Optional[float] = None
    allergies: Optional[List[str]] = None
    food_history: Optional[List[str]] = None

class BabyProfileResponse(BaseModel):
    id: int
    user_id: str
    baby_name: str
    date_of_birth: date
    gender: str
    current_weight_kg: Optional[float] = None
    current_height_cm: Optional[float] = None
    daily_calories_goal: float
    daily_protein_goal: float
    daily_iron_goal: float
    allergies: List[str]
    food_history: List[str]
    growth_records: List[Dict[str, Any]]
    age_months: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Recipe Schemas ---
class RecipeIngredientItem(BaseModel):
    ingredient_id: Optional[int] = None
    name_en: Optional[str] = None  # Lookup by name if ID not known
    weight_grams: float

class RecipeCreate(BaseModel):
    name_vi: str
    name_en: str
    description: Optional[str] = None
    meal_type: str  # "breakfast"|"lunch"|"dinner"|"snack"
    texture: str    # "puree"|"thin_porridge"|"thick_porridge"|"soft_solid"
    min_age_months: int
    max_age_months: int
    servings: int = 1
    prep_time_min: int = 10
    cooking_steps: List[Dict[str, Any]] = Field(default_factory=list)
    allergens: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None
    ingredients: List[RecipeIngredientItem]

class IngredientResponse(BaseModel):
    id: int
    usda_fdc_id: Optional[int] = None
    english_name: str
    vietnamese_name: str
    calories_kcal: float
    protein_g: float
    fat_g: float
    carbs_g: float
    iron_mg: float
    zinc_mg: float
    calcium_mg: float
    vitamin_c_mg: float
    omega3_mg: float
    food_group: str
    is_safe_baby: bool
    min_age_months: int

    class Config:
        from_attributes = True

class RecipeIngredientResponse(BaseModel):
    ingredient: IngredientResponse
    weight_grams: float

    class Config:
        from_attributes = True

class RecipeResponse(BaseModel):
    id: int
    name_vi: str
    name_en: str
    description: Optional[str] = None
    meal_type: str
    texture: str
    min_age_months: int
    max_age_months: int
    total_calories: float
    total_protein_g: float
    total_fat_g: float
    total_carbs_g: float
    total_iron_mg: float
    total_zinc_mg: float
    total_omega3_mg: float
    servings: int
    prep_time_min: int
    cooking_steps: List[Dict[str, Any]]
    allergens: List[str]
    tags: List[str]
    image_url: Optional[str] = None
    ingredients: List[RecipeIngredientResponse]

    class Config:
        from_attributes = True

class RecipeNutrition(BaseModel):
    recipe_id: int
    total_calories: float
    total_protein_g: float
    total_fat_g: float
    total_carbs_g: float
    total_iron_mg: float
    total_zinc_mg: float
    total_omega3_mg: float

# --- Recommendation & Goals Schemas ---
class DailyGoals(BaseModel):
    calories: float
    protein_g: float
    iron_mg: float
    fat_g: float

class DailyMenu(BaseModel):
    meals: Dict[str, RecipeResponse]  # e.g., {"breakfast": ..., "lunch": ..., "dinner": ..., "snack": ..., "supplementary_snack": ...}
    nutrition_totals: Dict[str, float]
    coverage_pct: Dict[str, float]
    meets_80pct: bool

class WeeklyMenu(BaseModel):
    days: List[DailyMenu]
