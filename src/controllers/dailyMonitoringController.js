import DailyMonitoring from "../models/DailyMonitoring.js";
import User from "../models/User.js";
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

    if (existingEntry) {
      return res.status(400).json({
        message: "You have already submitted your daily monitoring for today",
        data: existingEntry
      });
    }

    const entry = new DailyMonitoring({
      userId,
      date: req.body.date || new Date(),
      sleep: req.body.sleep,
      water: req.body.water,
      meals: req.body.meals,
      mood: req.body.mood,
      vitals: req.body.vitals,
      symptoms: req.body.symptoms
    });

    const saved = await entry.save();
    processMonitoringData(userId, saved).catch(err => console.error("Background processing error:", err));

    res.status(201).json({
      message: "Daily monitoring saved successfully! AI analysis in progress...",
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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentHistory = await DailyMonitoring.find({
      userId,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: -1 });

    const healthAnalysis = await analyzeHealthTrends(user, recentHistory);
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
    const user = await User.findById(userId);
    if (!user) return;

    user.aiContext = {
      lastUpdated: new Date(),
      healthSummary: healthAnalysis.summary,
      recommendations: healthAnalysis.recommendations,
      concerns: healthAnalysis.concerns,
      trends: healthAnalysis.trends
    };

    await user.save();
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
