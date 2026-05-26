import DietPlan from "../models/DietPlan.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PROMPTS } from "../config/market.vn.js";

export const generateAIDiet = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query } = req.body;

    const bioMistralClient = new GoogleGenerativeAI(process.env.BIOMISTRAL_API_KEY);
    const model = bioMistralClient.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = PROMPTS.singleRecipe(query);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let recipe;
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      recipe = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ message: "Failed to parse AI response" });
    }

    const recipeName = recipe.recipe || recipe.recipeName || "AI Meal";
    const normalizedRecipe = {
      recipe: recipeName,
      calories: recipe.calories || 300,
      ingredients: recipe.ingredients || [],
      steps: recipe.steps || [],
      youtubeLink: recipe.youtubeLink || ""
    };

    const aiMeal = { mealType: "AI Meal", ...normalizedRecipe, image: "https://via.placeholder.com/300x200?text=Recipe+Image" };
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const dietPlan = await DietPlan.findOne({ userId }).sort({ createdAt: -1 });
    if (!dietPlan) return res.status(404).json({ message: "No diet plan found" });

    const todayPlan = dietPlan.dailyMeals.find(d => d.day === today);
    if (todayPlan) todayPlan.meals.push(aiMeal);

    await dietPlan.save();
    res.json({ aiMeal });
  } catch (err) {
    res.status(500).json({ message: "AI meal generation failed", error: err.message });
  }
};

export const generatePersonalizedDietPlan = async (userId, data) => {
  try {
    const { monitoringData, healthAnalysis } = data;
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    if (!user) return;

    const bioMistralClient = new GoogleGenerativeAI(process.env.BIOMISTRAL_API_KEY);
    const model = bioMistralClient.getGenerativeModel({ model: "gemini-2.5-flash" });

    const context = `
**User Profile:**
- Name: ${user.name}
- Age: ${user.age}
- Gender: ${user.gender}
- Height: ${user.height} cm
- Weight: ${user.weight} kg
- Disease Tags: ${user.diseaseTags?.join(', ') || 'None'}
- Diet Type: ${user.dietType}
- User Type: ${user.userType || "student"}
- University: ${user.university || "N/A"}

**Today's Health Data:**
- Sleep: ${monitoringData.sleep?.hours || 0}h (quality: ${monitoringData.sleep?.quality || 0}/5)
- Water: ${monitoringData.water?.liters || 0}L
- Mood: ${monitoringData.mood?.score || 0}/5
- Vitals: Sugar ${monitoringData.vitals?.sugar || 'N/A'}, BP ${monitoringData.vitals?.bpHigh || 'N/A'}/${monitoringData.vitals?.bpLow || 'N/A'}

**Health Analysis:**
${healthAnalysis?.summary || 'Health data recorded'}

**Diet Focus:**
${healthAnalysis?.dietFocus || 'Balanced nutrition'}
`;

    const prompt = PROMPTS.weeklyDietPlan(context);

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const dietData = JSON.parse(jsonMatch[0]);
    const dietPlan = new DietPlan({
      userId,
      dailyMeals: dietData.weekPlan.map(day => ({
        day: day.day,
        meals: day.meals.map(meal => ({ ...meal, image: "https://via.placeholder.com/300x200?text=Meal+Image", youtubeLink: "" }))
      })),
      generatedFrom: "daily-monitoring",
      monitoringDate: monitoringData.date
    });

    await dietPlan.save();
    console.log(`Personalized diet plan generated for user ${userId}`);
  } catch (error) {
    console.error("Error generating personalized diet plan:", error);
  }
};
