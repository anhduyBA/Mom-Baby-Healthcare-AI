import DailyMonitoring from "../models/DailyMonitoring.js";
import User from "../models/User.js";
import LifestyleAlert from "../models/LifestyleAlert.js";
import { evaluateLifestyleRules } from "../utils/lifestyleRulesEngine.js";
import { generatePersonalizedDietPlan } from "./aiDietController.js";
import { analyzeHealthTrends } from "../utils/aiModelUtils.js";

export const createDailyMonitoring = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEntry = await DailyMonitoring.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    let saved;
    if (existingEntry) {
      existingEntry.sleep = req.body.sleep ?? existingEntry.sleep;
      existingEntry.water = req.body.water ?? existingEntry.water;
      existingEntry.meals = req.body.meals ?? existingEntry.meals;
      existingEntry.mood = req.body.mood ?? existingEntry.mood;
      existingEntry.vitals = req.body.vitals ?? existingEntry.vitals;
      existingEntry.symptoms = req.body.symptoms ?? existingEntry.symptoms;
      existingEntry.steps = req.body.steps ?? existingEntry.steps;
      existingEntry.babyIronInput = req.body.babyIronInput ?? existingEntry.babyIronInput;
      existingEntry.babyFoodTexture = req.body.babyFoodTexture ?? existingEntry.babyFoodTexture;
      existingEntry.babyFishServings = req.body.babyFishServings ?? existingEntry.babyFishServings;
      existingEntry.epdsScore = req.body.epdsScore ?? existingEntry.epdsScore;
      existingEntry.conceptionDayOfCycle = req.body.conceptionDayOfCycle ?? existingEntry.conceptionDayOfCycle;
      existingEntry.allergySymptomLogged = req.body.allergySymptomLogged ?? existingEntry.allergySymptomLogged;
      existingEntry.newFoodLogged = req.body.newFoodLogged ?? existingEntry.newFoodLogged;
      saved = await existingEntry.save();
    } else {
      const entry = new DailyMonitoring({
        userId,
        date: req.body.date || new Date(),
        sleep: req.body.sleep,
        water: req.body.water,
        meals: req.body.meals,
        mood: req.body.mood,
        vitals: req.body.vitals,
        symptoms: req.body.symptoms,
        steps: req.body.steps,
        babyIronInput: req.body.babyIronInput,
        babyFoodTexture: req.body.babyFoodTexture,
        babyFishServings: req.body.babyFishServings,
        epdsScore: req.body.epdsScore,
        conceptionDayOfCycle: req.body.conceptionDayOfCycle,
        allergySymptomLogged: req.body.allergySymptomLogged,
        newFoodLogged: req.body.newFoodLogged
      });
      saved = await entry.save();
    }

    // Evaluate maternal rules and save alerts
    try {
      if (req.healthProfile) {
        const { evaluateBusinessRules } = await import("../services/businessRuleService.js");
        const triggeredRules = await evaluateBusinessRules(saved, req.healthProfile);
        
        // Clear old alerts
        await LifestyleAlert.deleteMany({ userId });

        if (triggeredRules.length > 0) {
          const alertsToSave = triggeredRules.map(rule => ({
            userId,
            monitoringId: saved._id,
            ruleId: rule.ruleId,
            severity: rule.severity,
            title: rule.title,
            message: rule.message,
            suggestion: rule.suggestion,
            triggeredAt: rule.triggeredAt
          }));
          await LifestyleAlert.insertMany(alertsToSave);
        }
      }
    } catch (ruleErr) {
      console.error("Error evaluating maternal rules:", ruleErr);
    }

    processMonitoringData(userId, saved).catch(err => console.error("Background processing error:", err));

    res.status(200).json({
      message: "Daily monitoring saved and synced successfully! AI analysis in progress...",
      data: saved
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const processMonitoringData = async (userId, monitoringEntry) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const UserHealthProfile = (await import("../models/UserHealthProfile.js")).default;
    const healthProfile = await UserHealthProfile.findOne({ userId });

    const mergedUser = {
      ...user.toObject(),
      ...(healthProfile ? healthProfile.toObject() : {})
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentHistory = await DailyMonitoring.find({
      userId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 });

    const healthAnalysis = await analyzeHealthTrends(mergedUser, recentHistory);
    await generatePersonalizedDietPlan(userId, {
      monitoringData: monitoringEntry,
      healthAnalysis,
      recentHistory
    });

    await updateUserAIContext(userId, healthAnalysis);
  } catch (error) {
    console.error("Error in background processing:", error);
  }
};

const updateUserAIContext = async (userId, healthAnalysis) => {
  try {
    const UserHealthProfile = (await import("../models/UserHealthProfile.js")).default;
    const healthProfile = await UserHealthProfile.findOne({ userId });
    if (!healthProfile) return;

    healthProfile.aiContext = {
      lastUpdated: new Date(),
      healthSummary: healthAnalysis.summary,
      recommendations: healthAnalysis.recommendations,
      concerns: healthAnalysis.concerns,
      trends: healthAnalysis.trends
    };

    await healthProfile.save();
  } catch (error) {
    console.error("Error updating user AI context:", error);
  }
};

export const getDailyMonitoringHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 30;

    const history = await DailyMonitoring.find({ userId })
      .sort({ date: -1 })
      .limit(limit);

    res.json({ message: "Daily monitoring history fetched successfully", data: history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getTodayMonitoring = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEntry = await DailyMonitoring.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    res.json({
      message: todayEntry ? "Today's monitoring found" : "No entry for today",
      data: todayEntry,
      hasSubmittedToday: !!todayEntry
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getHealthInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await DailyMonitoring.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    if (!history.length) {
      return res.json({ message: "No monitoring data available", insights: null });
    }

    const insights = {
      averageSleep: calculateAverage(history, 'sleep.hours'),
      averageWater: calculateAverage(history, 'water.liters'),
      averageMood: calculateAverage(history, 'mood.score'),
      sleepQuality: calculateAverage(history, 'sleep.quality'),
      mealConsistency: calculateMealConsistency(history),
      vitalsTrends: calculateVitalsTrends(history),
      totalDays: history.length
    };

    res.json({ message: "Health insights generated successfully", insights, period: `${days} days` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const calculateAverage = (history, field) => {
  const values = history
    .map(entry => field.split('.').reduce((acc, key) => acc?.[key], entry))
    .filter(val => val != null && !isNaN(val));

  if (!values.length) return 0;
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
};

const calculateMealConsistency = (history) => {
  const totalMeals = history.reduce((count, entry) => {
    count += entry.meals?.breakfast ? 1 : 0;
    count += entry.meals?.lunch ? 1 : 0;
    count += entry.meals?.dinner ? 1 : 0;
    return count;
  }, 0);

  const possibleMeals = history.length * 3;
  return ((totalMeals / possibleMeals) * 100).toFixed(1);
};

const calculateVitalsTrends = (history) => {
  const vitalsEntries = history.filter(entry => entry.vitals);
  if (!vitalsEntries.length) return null;

  return {
    avgSugar: calculateAverage(history, 'vitals.sugar'),
    avgBpHigh: calculateAverage(history, 'vitals.bpHigh'),
    avgBpLow: calculateAverage(history, 'vitals.bpLow'),
    avgWeight: calculateAverage(history, 'vitals.weight')
  };
};
