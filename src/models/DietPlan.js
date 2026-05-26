import mongoose from "mongoose";

const mealSchema = new mongoose.Schema({
  mealType: { type: String, required: true },
  recipe: { type: String, required: true },
  calories: { type: Number, default: 0 },
  image: { type: String },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },
  youtubeLink: { type: String },
});

const dailyMealSchema = new mongoose.Schema({
  day: { type: String, required: true },
  meals: { type: [mealSchema], default: [] },
});

const dietPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    weekNumber: { type: Number },
    dailyMeals: { type: [dailyMealSchema], default: [] },
    generatedFrom: { type: String, default: "manual" },
    monitoringDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.DietPlan || mongoose.model("DietPlan", dietPlanSchema);
