import { GoogleGenerativeAI } from "@google/generative-ai";
import { classifyStudentProfile } from "./profileClassifier.js";
import { buildRecipePrompt } from "./recipePromptBuilder.js";
import Recipe from "../models/Recipe.js";

let genAI = null;
let model = null;

function getAIModel() {
  const key = process.env.GEMINI_API_KEY || process.env.BIOMISTRAL_API_KEY;
  if (!key) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return model;
}

/**
 * Safely parses the JSON string returned by Gemini, stripping markdown code blocks.
 * @param {string} text - Raw model response.
 * @returns {Object|null} Parsed JSON object or null.
 */
function parseAIResponse(text) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse Gemini response JSON:", err);
    return null;
  }
}

/**
 * Generates personalized Vietnamese student-friendly recipes using Gemini.
 * Checks cache (24 hours) and cooldown (6 hours) first.
 * 
 * @param {string} userId - User Mongoose ID.
 * @param {Object} lifestyleData - Recent lifestyle entries for classification.
 * @param {Object} preferences - Dietary, allergy, max cook time preferences.
 * @returns {Promise<Array>} List of generated or cached recipes.
 */
export async function generateRecipesForStudent(userId, healthProfile, preferences = {}) {
  // 1. Classify maternal profile
  const { classifyMaternalProfile } = await import("./profileClassifier.js");
  const profile = classifyMaternalProfile(healthProfile || {});

  // 2. Cache check: check if any recipe was generated for same (userId + profileId) within last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cachedRecipes = await Recipe.find({
    userId,
    profileId: profile.profileId,
    generatedAt: { $gte: twentyFourHoursAgo }
  });

  if (cachedRecipes.length > 0) {
    console.log(`[ML] Returning cached recipes for user ${userId} and profile ${profile.profileId}`);
    return {
      profile,
      recipes: cachedRecipes
    };
  }

  // 3. Cooldown check: students can regenerate at most once per 6 hours
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recentGeneration = await Recipe.findOne({
    userId,
    generatedAt: { $gte: sixHoursAgo }
  });

  if (recentGeneration) {
    const nextAvailableTime = new Date(recentGeneration.generatedAt.getTime() + 6 * 60 * 60 * 1000);
    const diffMs = nextAvailableTime.getTime() - Date.now();
    const diffMins = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    throw new Error(`Bạn đang trong thời gian chờ. Vui lòng đợi ${diffMins} phút nữa để tạo thực đơn mới.`);
  }

  // Verify API Key and Model
  const modelInstance = getAIModel();
  if (!modelInstance) {
    throw new Error("Cấu hình API Key (GEMINI_API_KEY hoặc BIOMISTRAL_API_KEY) chưa được thiết lập.");
  }

  // 4. Build prompt
  const prompt = buildRecipePrompt(profile, preferences);

  // 5. Call Gemini
  const result = await modelInstance.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  const parsed = parseAIResponse(text);
  if (!parsed || !Array.isArray(parsed.recipes)) {
    throw new Error("Không thể trích xuất danh sách công thức nấu ăn từ phản hồi của AI.");
  }

  const generatedAt = new Date();
  const savedRecipes = [];

  for (const r of parsed.recipes) {
    // Generate AI image using Pollinations
    const imagePrompt = encodeURIComponent(`Professional food photo of Vietnamese recipe: ${r.title}, realistic, clean background`);
    const imageUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1024&nologo=true&enhance=true`;

    const recipeDoc = new Recipe({
      userId,
      profileId: profile.profileId,
      title: r.title || "Món ăn dinh dưỡng",
      description: r.description || "",
      ingredients: r.ingredients || [],
      steps: r.steps || [],
      nutritionInfo: {
        calories: Number(r.nutritionInfo?.calories ?? 0),
        protein: String(r.nutritionInfo?.protein ?? "0g"),
        carbs: String(r.nutritionInfo?.carbs ?? "0g"),
        fat: String(r.nutritionInfo?.fat ?? "0g"),
        prepTime: String(r.nutritionInfo?.prepTime ?? "20 phút"),
        difficulty: String(r.nutritionInfo?.difficulty ?? "Dễ")
      },
      tags: r.tags || [],
      imageUrl,
      isSaved: false,
      generatedAt
    });

    await recipeDoc.save();
    savedRecipes.push(recipeDoc);
  }

  return {
    profile,
    recipes: savedRecipes
  };
}

/**
 * Returns saved/paginated recipes for a student.
 * 
 * @param {string} userId - User Mongoose ID.
 * @param {Object} filters - Query filtering options.
 * @returns {Promise<Object>} Paginated result object.
 */
export async function getSavedRecipes(userId, filters = {}) {
  const query = { userId };
  
  if (filters.profileId) {
    query.profileId = filters.profileId;
  }
  
  if (filters.tags) {
    const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    query.tags = { $in: tagsArray };
  }
  
  if (filters.difficulty) {
    query["nutritionInfo.difficulty"] = filters.difficulty;
  }

  // Optional: Only show bookmarked recipes if specified
  if (filters.isSaved !== undefined) {
    query.isSaved = filters.isSaved === "true" || filters.isSaved === true;
  }

  const page = parseInt(filters.page || 1);
  const limit = parseInt(filters.limit || 10);
  const skip = (page - 1) * limit;

  const items = await Recipe.find(query)
    .sort({ generatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Recipe.countDocuments(query);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Toggles a recipe's bookmarked isSaved status.
 * 
 * @param {string} userId - User ID.
 * @param {string} recipeId - Recipe Database ID.
 * @returns {Promise<Object>} The updated recipe.
 */
export async function toggleSaveRecipe(userId, recipeId) {
  const recipe = await Recipe.findOne({ _id: recipeId, userId });
  if (!recipe) {
    throw new Error("Không tìm thấy công thức nấu ăn hoặc bạn không có quyền sửa đổi.");
  }

  recipe.isSaved = !recipe.isSaved;
  await recipe.save();
  return recipe;
}
