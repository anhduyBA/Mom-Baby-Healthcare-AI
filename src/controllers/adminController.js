import LifestyleEntry from "../models/LifestyleEntry.js";
import RuleThreshold from "../models/RuleThreshold.js";

/**
 * Retrieve students triggering HIGH-severity rules.
 * GET /api/admin/students/risk
 */
export const getStudentsRisk = async (req, res) => {
  try {
    const riskStudents = await LifestyleEntry.aggregate([
      { $sort: { date: -1 } },
      {
        $group: {
          _id: "$userId",
          latestEntry: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          healthScore: "$latestEntry.healthScore",
          alerts: "$latestEntry.alerts"
        }
      }
    ]);

    const result = riskStudents
      .filter(item => item.alerts.some(alert => alert.severity === "HIGH"))
      .map(item => ({
        userId: item.userId,
        name: item.name,
        triggeredRules: item.alerts.filter(alert => alert.severity === "HIGH"),
        healthScore: item.healthScore
      }));

    return res.status(200).json({
      success: true,
      data: result,
      message: "At-risk students retrieved successfully."
    });
  } catch (error) {
    console.error("Error in getStudentsRisk:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};

/**
 * Retrieve aggregated reporting stats.
 * GET /api/admin/reports/summary
 */
export const getReportsSummary = async (req, res) => {
  try {
    // 1. Stress Level Distribution
    const stressDistribution = await LifestyleEntry.aggregate([
      { $group: { _id: "$stressLevel", count: { $sum: 1 } } }
    ]);
    const stressDist = { Low: 0, Moderate: 0, High: 0 };
    stressDistribution.forEach(item => {
      if (item._id && stressDist[item._id] !== undefined) {
        stressDist[item._id] = item.count;
      }
    });

    // 2. Average Health Score by Day
    const avgHealthScoreByDay = await LifestyleEntry.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          avgScore: { $avg: "$healthScore" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const healthScoreTrend = avgHealthScoreByDay.map(item => ({
      date: item._id,
      avgHealthScore: Math.round(item.avgScore)
    }));

    // 3. Top 5 Most Triggered Rules
    const allEntries = await LifestyleEntry.find({});
    const ruleCounts = {};
    for (const entry of allEntries) {
      for (const alert of entry.alerts) {
        ruleCounts[alert.ruleId] = (ruleCounts[alert.ruleId] || 0) + 1;
      }
    }
    const topTriggeredRules = Object.entries(ruleCounts)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        stressLevelDistribution: stressDist,
        healthScoreTrend,
        topTriggeredRules
      },
      message: "Reports summary statistics compiled successfully."
    });
  } catch (error) {
    console.error("Error in getReportsSummary:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};

/**
 * Override/create a dynamic threshold for a specific rule.
 * POST /api/admin/rules/thresholds
 */
export const updateRuleThresholds = async (req, res) => {
  try {
    const { ruleId, thresholds } = req.body;

    if (!ruleId || !thresholds || typeof thresholds !== "object") {
      return res.status(400).json({
        success: false,
        data: null,
        message: "Validation Error: 'ruleId' and 'thresholds' (object) are required."
      });
    }

    const updated = await RuleThreshold.findOneAndUpdate(
      { ruleId },
      { thresholds, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      data: updated,
      message: `Threshold for rule ${ruleId} updated successfully.`
    });
  } catch (error) {
    console.error("Error in updateRuleThresholds:", error);
    return res.status(500).json({
      success: false,
      data: null,
      message: error.message
    });
  }
};
