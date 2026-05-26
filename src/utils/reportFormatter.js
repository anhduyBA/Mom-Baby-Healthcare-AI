const getSeverityInfo = (score) => {
  if (score === null || score === undefined) {
    return { label: "Not Provided", emoji: "❓", color: "gray", level: 0 };
  }
  if (score <= 30) {
    return { label: "Low", emoji: "🟢", color: "green", level: 1, recommendation: "Self-care sufficient" };
  }
  if (score <= 70) {
    return { label: "Medium", emoji: "🟡", color: "yellow", level: 2, recommendation: "Consultation recommended" };
  }
  return { label: "High", emoji: "🔴", color: "red", level: 3, recommendation: "Immediate medical attention required" };
};

const normalizePath = (path) => (path ? path.replace(/\\/g, "/") : "");

const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    return new Date(isoDate).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "Invalid Date";
  }
};

const formatDateShort = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    return new Date(isoDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "Invalid Date";
  }
};

const calculateBMI = (weight, height) => {
  if (!weight || !height) return null;
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(2);
};

const getBMICategory = (bmi) => {
  if (!bmi) return { category: "Unknown", emoji: "❓", color: "gray" };
  if (bmi < 18.5) return { category: "Underweight", emoji: "⚠️", color: "yellow" };
  if (bmi < 25) return { category: "Normal", emoji: "✅", color: "green" };
  if (bmi < 30) return { category: "Overweight", emoji: "⚠️", color: "orange" };
  return { category: "Obese", emoji: "🔴", color: "red" };
};

const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

export const formatReportData = (raw) => {
  const bmi = raw.user.bmi || calculateBMI(raw.user.weight, raw.user.height);
  const bmiInfo = getBMICategory(bmi);

  return {
    user: {
      name: raw.user.name || "Unknown",
      email: raw.user.email || "Not provided",
      phone: raw.user.phone || "Not provided",
      age: raw.user.age || calculateAge(raw.user.dateOfBirth) || "N/A",
      gender: raw.user.gender || "Not specified",
      height: raw.user.height ? `${raw.user.height} cm` : "Not provided",
      weight: raw.user.weight ? `${raw.user.weight} kg` : "Not provided",
      bmi: bmi ? parseFloat(bmi) : null,
      bmiFormatted: bmi ? `${bmi} (${bmiInfo.category})` : "Not calculated",
      bmiCategory: bmiInfo,
      diseaseTags: raw.user.diseaseTags || [],
      diseaseTagsFormatted: (raw.user.diseaseTags || []).join(", ") || "None",
      dietType: raw.user.dietType || "Regular",
      allergies: raw.user.allergies || [],
      medications: raw.user.medications || [],
    },
    summary: {
      avgSeverity30: raw.summary.avgSeverity30 ? parseFloat(raw.summary.avgSeverity30).toFixed(2) : 0,
      avgSeverityInfo: getSeverityInfo(raw.summary.avgSeverity30),
      maxSeverity: raw.summary.maxSeverity || 0,
      maxSeverityInfo: getSeverityInfo(raw.summary.maxSeverity),
      totalEntries: raw.summary.totalEntries || 0,
      alertCount: raw.summary.alertCount || 0,
      alertRate: raw.summary.totalEntries > 0 ? ((raw.summary.alertCount / raw.summary.totalEntries) * 100).toFixed(1) + "%" : "0%",
      reportGeneratedAt: formatDate(new Date().toISOString()),
      reportPeriod: raw.summary.period || "Last 30 days",
    },
    entries: Array.isArray(raw.entries)
      ? raw.entries
          .map((entry, index) => {
            const severityInfo = getSeverityInfo(entry.severity);
            const condition = entry.modelResult?.predicted_condition || "Not analyzed";
            return {
              id: entry.id || entry._id,
              entryNumber: index + 1,
              rawDate: entry.date || new Date().toISOString(),
              dateFormatted: formatDate(entry.date),
              dateShort: formatDateShort(entry.date),
              description: entry.description || entry.textDescription || "No description provided",
              severity: entry.severity ?? 0,
              severityInfo,
              severityFormatted: `${severityInfo.emoji} ${entry.severity ?? 0}/100 - ${severityInfo.label}`,
              condition,
              conditionFormatted: `🏥 ${condition}`,
              modelResult: entry.modelResult || null,
              recommendations: entry.modelResult?.recommendations || { diet: [], habits: [], doctor: "No specific recommendations" },
              images: (entry.images || []).map(normalizePath),
              hasImages: (entry.images || []).length > 0,
              imageCount: (entry.images || []).length,
              alertFlag: entry.alertFlag || false,
              alertSent: entry.alertFlag ? "✅ Yes" : "❌ No",
            };
          })
          .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
      : [],
    alerts: Array.isArray(raw.alerts)
      ? raw.alerts
          .map((alert, index) => {
            const severityInfo = getSeverityInfo(alert.severityScore || alert.severity);
            return {
              id: alert._id || alert.id,
              alertNumber: index + 1,
              rawDate: alert.createdAt || new Date().toISOString(),
              dateFormatted: formatDate(alert.createdAt),
              dateShort: formatDateShort(alert.createdAt),
              type: alert.type || "symptom",
              typeFormatted: (alert.type || "symptom").toUpperCase(),
              severity: alert.severityScore ?? alert.severity ?? 0,
              severityInfo,
              severityFormatted: `${severityInfo.emoji} ${alert.severityScore ?? alert.severity ?? 0}/100 - ${severityInfo.label}`,
              description: alert.textDescription || alert.message || alert.description || "No description",
              status: alert.status || "pending",
              statusFormatted: alert.status === "resolved" ? "✅ Resolved" : "⏳ Pending",
              channels: alert.channels || ["app"],
              channelsFormatted: (alert.channels || ["app"]).join(", "),
            };
          })
          .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate))
      : [],
    statistics: {
      totalSymptoms: Array.isArray(raw.entries) ? raw.entries.length : 0,
      totalAlerts: Array.isArray(raw.alerts) ? raw.alerts.length : 0,
      lowSeverityCount: Array.isArray(raw.entries) ? raw.entries.filter(e => (e.severity ?? 0) <= 30).length : 0,
      mediumSeverityCount: Array.isArray(raw.entries) ? raw.entries.filter(e => (e.severity ?? 0) > 30 && (e.severity ?? 0) <= 70).length : 0,
      highSeverityCount: Array.isArray(raw.entries) ? raw.entries.filter(e => (e.severity ?? 0) > 70).length : 0,
    },
  };
};

export const generateTextSummary = (formattedData) => {
  const { user, summary, statistics } = formattedData;
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 HEALTHSYNC MEDICAL REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 PATIENT INFORMATION:
   Name: ${user.name}
   Age: ${user.age} | Gender: ${user.gender}
   BMI: ${user.bmiFormatted}
   Medical Conditions: ${user.diseaseTagsFormatted}
   Diet Type: ${user.dietType}

📊 HEALTH SUMMARY (${summary.reportPeriod}):
   Total Symptoms Logged: ${statistics.totalSymptoms}
   Total Alerts Triggered: ${statistics.totalAlerts}
   Average Severity: ${summary.avgSeverity30} ${summary.avgSeverityInfo.emoji}
   Maximum Severity: ${summary.maxSeverity} ${summary.maxSeverityInfo.emoji}
   Alert Rate: ${summary.alertRate}

⚡ SEVERITY BREAKDOWN:
   ${statistics.lowSeverityCount} Low 🟢 | ${statistics.mediumSeverityCount} Medium 🟡 | ${statistics.highSeverityCount} High 🔴

📅 Report Generated: ${summary.reportGeneratedAt}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `;
};

export default formatReportData;
