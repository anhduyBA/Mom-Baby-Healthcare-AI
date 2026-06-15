from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    name_vi = Column(String, nullable=False, index=True)
    name_en = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)
    
    meal_type = Column(String, nullable=False, index=True)  # "breakfast"|"lunch"|"dinner"|"snack"
    texture = Column(String, nullable=False, index=True)    # "puree"|"thin_porridge"|"thick_porridge"|"soft_solid"
    
    min_age_months = Column(Integer, default=6, nullable=False)
    max_age_months = Column(Integer, default=24, nullable=False)

    # Auto-calculated totals across ingredients
    total_calories = Column(Float, default=0.0, nullable=False)
    total_protein_g = Column(Float, default=0.0, nullable=False)
    total_fat_g = Column(Float, default=0.0, nullable=False)
    total_carbs_g = Column(Float, default=0.0, nullable=False)
    total_iron_mg = Column(Float, default=0.0, nullable=False)
    total_zinc_mg = Column(Float, default=0.0, nullable=False)
    total_omega3_mg = Column(Float, default=0.0, nullable=False)

    servings = Column(Integer, default=1, nullable=False)
    prep_time_min = Column(Integer, default=10, nullable=False)
    
    cooking_steps = Column(JSON, default=list, nullable=False)  # [{"step": 1, "instruction": "...", "duration": "5 phút"}]
    allergens = Column(JSON, default=list, nullable=False)      # ["egg", "fish", "milk", "peanut"]
    tags = Column(JSON, default=list, nullable=False)           # ["giàu sắt", "dễ làm", "mát", "bổ"]
    image_url = Column(String, nullable=True)

    # Relationships
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    weight_grams = Column(Float, nullable=False)

    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient")
