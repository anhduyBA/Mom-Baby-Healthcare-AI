import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: String, required: true },
  unit: { type: String, required: true }
}, { _id: false });

const StepSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  instruction: { type: String, required: true },
  duration: { type: String, default: "" }
}, { _id: false });

const NutritionInfoSchema = new mongoose.Schema({
  calories: { type: Number, required: true },
  protein: { type: String, required: true },
  carbs: { type: String, required: true },
  fat: { type: String, required: true },
  prepTime: { type: String, required: true },
  difficulty: { type: String, enum: ["Dễ", "Trung bình", "Khó"], default: "Dễ" }
}, { _id: false });

const RecipeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    profileId: {
      type: String,
      enum: ["pre-natal", "pregnant", "post-natal"],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    ingredients: [IngredientSchema],
    steps: [StepSchema],
    nutritionInfo: NutritionInfoSchema,
    tags: [String],
    imageUrl: {
      type: String,
      default: ""
    },
    isSaved: {
      type: Boolean,
      default: false
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.models.Recipe || mongoose.model("Recipe", RecipeSchema);
