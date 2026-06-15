import User from "../models/User.js";
import SymptomEntry from "../models/SymptomEntry.js";

const getBMI = (user) => {
  if (!user.height || !user.weight) return null;
  const heightMeters = user.height / 100;
  return Number((user.weight / (heightMeters * heightMeters)).toFixed(2));
};

const getSymptomEntries = async (userId, days = 30) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return await SymptomEntry.find({ userId, createdAt: { $gte: since } }).sort({ createdAt: -1 });
};

const getSummaryStats = (entries) => {
  if (!entries.length) return { avgSeverity30: 0, maxSeverity: 0, total: 0 };
  const severities = entries.map(e => e.severityScore || 0);
  return {
    avgSeverity30: Number((severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(2)),
    maxSeverity: Math.max(...severities),
    total: entries.length
  };
};

const getAlerts = async (userId) => {
  return await SymptomEntry.find({ userId, alertFlag: true }).sort({ createdAt: -1 });
};

export const getUserReportData = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const UserHealthProfile = (await import("../models/UserHealthProfile.js")).default;
    const healthProfile = await UserHealthProfile.findOne({ userId });

    const entries = await getSymptomEntries(userId, 30);
    const summary = getSummaryStats(entries);
    const alerts = await getAlerts(userId);

    const mergedUser = {
      ...user.toObject(),
      ...(healthProfile ? healthProfile.toObject() : {})
    };

    res.json({
      user: {
        name: mergedUser.name,
        email: mergedUser.email,
        age: mergedUser.age,
        gender: mergedUser.gender,
        height: mergedUser.height,
        weight: mergedUser.weight,
        bmi: getBMI(mergedUser),
        diseaseTags: mergedUser.diseaseTags,
        dietType: mergedUser.dietType
      },
      summary: {
        avgSeverity30: summary.avgSeverity30,
        maxSeverity: summary.maxSeverity,
        totalEntries: summary.total,
        alertCount: alerts.length
      },
      entries: entries.map(e => ({
        id: e._id,
        date: e.createdAt,
        description: e.textDescription,
        severity: e.severityScore,
        modelResult: e.modelResult,
        images: e.images
      })),
      alerts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
