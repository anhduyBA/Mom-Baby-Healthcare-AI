import LifestyleEntry from "../models/LifestyleEntry.js";
import User from "../models/User.js";
import { evaluateBusinessRules } from "../services/businessRuleService.js";
import { calculateHealthScore } from "../services/healthScoreService.js";
import { classifyStudentProfile } from "../services/profileService.js";

/**
 * Validates the inputs for a lifestyle entry.
 * @param {Object} body - Request body.
 * @returns {string|null} Error message or null if valid.
 */
function validateLifestyleInput(body) {
  const fields = [
    "studyHours",
    "sleepHours",
    "physicalHours",
    "socialHours",
    "extracurricularHours",
    "gpa"
  ];

  for (const field of fields) {
    if (body[field] === undefined || body[field] === null) {
      return `Field '${field}' is required.`;
    }
    const val = Number(body[field]);
    if (isNaN(val) || val < 0) {
      return `Field '${field}' must be a non-negative number.`;
    }
  }

  const stressLevel = body.stressLevel ?? "Low";
  if (!["Low", "Moderate", "High"].includes(stressLevel)) {
    return "Field 'stressLevel' must be one of: 'Low', 'Moderate', 'High'.";
  }

  const gpa = Number(body.gpa);
  if (gpa > 4.0) {
    return "GPA cannot exceed 4.0.";
  }

  return null;
}

/**
 * Submit (create or update) a daily lifestyle entry.
 * POST /api/lifestyle/entry
 */
export const submitLifestyleEntry = async (req, res) => {
  try {
    const errorMsg = validateLifestyleInput(req.body);
    if (errorMsg) {
      return res.status(400).json({
        success: false,
        data: null,
        message: `Validation Error: ${errorMsg}`
      });
    }

    const userId = req.user._id;
    const {
      studyHours,
      sleepHours,
      physicalHours,
      socialHours,
      extracurricularHours,
      gpa,
      stressLevel
    } = req.body;

    // Truncate current date to midnight for unique comparison
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    // 1. Evaluate business rules
    const alerts = await evaluateBusinessRules({
      studyHours,
      sleepHours,
      physicalHours,
      socialHours,
      extracurricularHours,
      gpa,
      stressLevel
    });

    // 2. Compute health score
    const healthScore = calculateHealthScore({
      studyHours,
      sleepHours,
      physicalHours,
      socialHours,
      gpa
    });

    const lifestyleProfile = classifyStudentProfile({
      studyHours,
      sleepHours,
      physicalHours,
      socialHours,
      extracurricularHours,
      gpa,
      stressLevel
    });

    // 3. Save / Upsert entry
    const entry = await LifestyleEntry.findOneAndUpdate(
      { userId, date },
      {
        studyHours,
        sleepHours,
        physicalHours,
        socialHours,
        extracurricularHours,
        gpa,
        stressLevel,
        alerts,
        healthScore,
        lifestyleProfile
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Update User model
    await User.findByIdAndUpdate(userId, { lifestyleProfile });

    return res.status(200).json({
      success: true,
      data: entry,
      message: "Lifestyle entry submitted successfully."
    });
  } catch (error) {
    console.error("Error in submitLifestyleEntry:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};

/**
 * Retrieve today's entry.
 * GET /api/lifestyle/today
 */
export const getTodayEntry = async (req, res) => {
  try {
    const userId = req.user._id;
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const entry = await LifestyleEntry.findOne({ userId, date });

    return res.status(200).json({
      success: true,
      data: entry,
      message: entry ? "Today's entry retrieved successfully." : "No entry found for today."
    });
  } catch (error) {
    console.error("Error in getTodayEntry:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};

/**
 * Retrieve historical entries.
 * GET /api/lifestyle/history?days=30
 */
export const getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = Number(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const history = await LifestyleEntry.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      data: history,
      message: "Historical trend retrieved successfully."
    });
  } catch (error) {
    console.error("Error in getHistory:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};

/**
 * Retrieve high-severity alerts from the last 7 days.
 * GET /api/lifestyle/alerts
 */
export const getAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const entries = await LifestyleEntry.find({
      userId,
      date: { $gte: sevenDaysAgo }
    });

    const highAlerts = [];
    for (const entry of entries) {
      const filtered = entry.alerts.filter(a => a.severity === "HIGH");
      highAlerts.push(...filtered);
    }

    return res.status(200).json({
      success: true,
      data: highAlerts,
      message: "HIGH severity alerts from the last 7 days retrieved successfully."
    });
  } catch (error) {
    console.error("Error in getAlerts:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};

/**
 * Retrieve average healthScore, most triggered rules, and streak count.
 * GET /api/lifestyle/summary
 */
export const getSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const entries = await LifestyleEntry.find({ userId }).sort({ date: -1 });

    if (entries.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          avgHealthScore: 0,
          mostTriggeredRules: [],
          streakCount: 0
        },
        message: "No lifestyle summary data available."
      });
    }

    // 1. Calculate Average Health Score
    const totalScore = entries.reduce((sum, e) => sum + e.healthScore, 0);
    const avgHealthScore = Math.round(totalScore / entries.length);

    // 2. Count most triggered rules
    const ruleCounts = {};
    for (const entry of entries) {
      for (const alert of entry.alerts) {
        ruleCounts[alert.ruleId] = (ruleCounts[alert.ruleId] || 0) + 1;
      }
    }
    const mostTriggeredRules = Object.entries(ruleCounts)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count);

    // 3. Calculate Streak Count (consecutive days healthScore >= 70)
    let streakCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDate = new Date(entries[0].date);
    latestDate.setHours(0, 0, 0, 0);

    // Only count streak if user submitted today or yesterday
    if (latestDate.getTime() === today.getTime() || latestDate.getTime() === yesterday.getTime()) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.healthScore >= 70) {
          if (i === 0) {
            streakCount = 1;
          } else {
            const prevEntryDate = new Date(entries[i - 1].date);
            const currEntryDate = new Date(entry.date);
            const diffTime = Math.abs(prevEntryDate - currEntryDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              streakCount++;
            } else {
              break; // Gap detected, streak ends
            }
          }
        } else {
          break; // Score below 70, streak ends
        }
      }
    }

    // 4. Additional fields for dashboard charts
    const currentScore = entries[0].healthScore;
    const prevScore = entries.length > 1 ? entries[1].healthScore : currentScore;
    const trend = currentScore - prevScore;

    const latest = entries[0];
    const radarData = {
      study: Math.min(100, Math.round((latest.studyHours / 8) * 100)),
      sleep: Math.min(100, Math.round((latest.sleepHours / 8) * 100)),
      physical: Math.min(100, Math.round((latest.physicalHours / 1.5) * 100)),
      social: Math.min(100, Math.round((latest.socialHours / 3) * 100)),
      gpa: Math.min(100, Math.round((latest.gpa / 4.0) * 100))
    };

    const scoreTrends = entries.slice(0, 30).map(h => ({
      date: new Date(h.date).toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }),
      healthScore: h.healthScore
    })).reverse();

    return res.status(200).json({
      success: true,
      data: {
        healthScore: currentScore,
        trend,
        radarData,
        scoreTrends,
        avgHealthScore,
        mostTriggeredRules,
        streakCount
      },
      message: "Lifestyle summary statistics calculated successfully."
    });
  } catch (error) {
    console.error("Error in getSummary:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};
