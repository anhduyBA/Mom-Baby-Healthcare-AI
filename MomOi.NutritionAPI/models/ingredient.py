from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime
from database import Base

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    usda_fdc_id = Column(Integer, unique=True, index=True, nullable=True)
    english_name = Column(String, nullable=False, index=True)
    vietnamese_name = Column(String, nullable=False, index=True)
    
    # Nutrients per 100g
    calories_kcal = Column(Float, default=0.0, nullable=False)
    protein_g = Column(Float, default=0.0, nullable=False)
    fat_g = Column(Float, default=0.0, nullable=False)
    carbs_g = Column(Float, default=0.0, nullable=False)
    iron_mg = Column(Float, default=0.0, nullable=False)
    zinc_mg = Column(Float, default=0.0, nullable=False)
    calcium_mg = Column(Float, default=0.0, nullable=False)
    vitamin_c_mg = Column(Float, default=0.0, nullable=False)
    omega3_mg = Column(Float, default=0.0, nullable=False)

    food_group = Column(String, default="Khác", nullable=False)  # "Thịt", "Rau củ", "Ngũ cốc", "Cá", "Trứng/Sữa", "Khác"
    is_safe_baby = Column(Boolean, default=True, nullable=False)
    min_age_months = Column(Integer, default=6, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
