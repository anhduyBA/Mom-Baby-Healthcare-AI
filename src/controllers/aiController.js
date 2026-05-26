import { GoogleGenerativeAI } from "@google/generative-ai";
import { PROMPTS } from "../config/market.vn.js";

const parseAIResponse = (text) => {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse BioMistral response:", err);
    return [];
  }
};

export const generateAIRecipes = async (req, res) => {
  console.log("AI Recipe Generation Started");
  
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }

    if (!process.env.BIOMISTRAL_API_KEY) {
      return res.status(500).json({ message: "BioMistral API key not configured" });
    }

    const bioMistralClient = new GoogleGenerativeAI(process.env.BIOMISTRAL_API_KEY);
    const model = bioMistralClient.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = PROMPTS.multiRecipes(query);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let recipes = parseAIResponse(text);
    if (!recipes || recipes.length === 0) {
      return res.status(500).json({ message: "Failed to generate recipes", rawResponse: text.substring(0, 200) });
    }

    recipes = recipes.map(r => ({
      recipe: r.recipe || r.recipeName || "AI Recipe",
      calories: r.calories || 300,
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      youtubeLink: r.youtubeLink || "",
      mealType: "AI Generated"
    }));

    for (let r of recipes) {
      try {
        const imagePrompt = encodeURIComponent(PROMPTS.recipeImage(r.recipe));
        r.image = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1024&nologo=true&enhance=true`;
      } catch {
        r.image = "https://via.placeholder.com/300x200?text=Recipe+Image";
      }
    }

    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: "AI recipe generation failed", error: err.message });
  }
};
