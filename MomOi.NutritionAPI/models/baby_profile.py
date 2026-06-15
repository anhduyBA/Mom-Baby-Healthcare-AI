from sqlalchemy import Column, Integer, String, Float, DateTime, Date, JSON
from datetime import datetime
from database import Base

class BabyProfile(Base):
    __tablename__ = "baby_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # User ID mapping from SQL Server
    baby_name = Column(String, nullable=False, index=True)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String, nullable=False)  # "male" | "female"
    
    current_weight_kg = Column(Float, nullable=True)
    current_height_cm = Column(Float, nullable=True)

    # WHO nutrition goals
    daily_calories_goal = Column(Float, default=0.0, nullable=False)
    daily_protein_goal = Column(Float, default=0.0, nullable=False)
    daily_iron_goal = Column(Float, default=0.0, nullable=False)

    allergies = Column(JSON, default=list, nullable=False)      # ["egg", "fish"]
    food_history = Column(JSON, default=list, nullable=False)    # ["Sweet potato", "Salmon"]
    growth_records = Column(JSON, default=list, nullable=False)  # [{"date": "2026-06-04", "weight_kg": 7.2, "height_cm": 65.5}]

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    @property
    def age_months(self) -> int:
        today = datetime.utcnow().date()
        dob = self.date_of_birth
        years_diff = today.year - dob.year
        months_diff = today.month - dob.month
        total_months = years_diff * 12 + months_diff
        # Handle day boundary comparison
        if today.day < dob.day:
            total_months -= 1
        return max(0, total_months)
