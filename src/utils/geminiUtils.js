import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeHealthTrends = async (user, monitoringHistory) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const dataSummary = monitoringHistory.map((entry, i) => ({
      day: i + 1,
      date: entry.date.toISOString().split('T')[0],
      sleep: `${entry.sleep?.hours || 0}h (quality: ${entry.sleep?.quality || 0}/5)`,
      water: `${entry.water?.liters || 0}L`,
      meals: `B:${entry.meals?.breakfast ? '✓' : '✗'} L:${entry.meals?.lunch ? '✓' : '✗'} D:${entry.meals?.dinner ? '✓' : '✗'}`,
      mood: `${entry.mood?.score || 0}/5${entry.mood?.note ? ` - ${entry.mood.note}` : ''}`,
      vitals: entry.vitals ? `Sugar:${entry.vitals.sugar} BP:${entry.vitals.bpHigh}/${entry.vitals.bpLow} Weight:${entry.vitals.weight}kg` : 'N/A',
      symptoms: entry.symptoms?.note || 'None'
    }));

    const prompt = `You are a health analysis AI for HealthSync (Indian health app).

User Profile:
- Name: ${user.name}
- Age: ${user.age || 'N/A'}
- Gender: ${user.gender || 'N/A'}
- Height: ${user.height || 'N/A'} cm
- Weight: ${user.weight || 'N/A'} kg
- Disease Tags: ${user.diseaseTags?.join(', ') || 'None'}
- Diet Type: ${user.dietType || 'N/A'}

Daily Monitoring Data (Last ${monitoringHistory.length} days):
${JSON.stringify(dataSummary, null, 2)}

Task:
Analyze health trends and return JSON with summary, trends, recommendations, concerns, and dietFocus.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error in Gemini health analysis:", error);
    return {
      summary: "Unable to generate detailed analysis at this time.",
      trends: { sleep: "Data recorded", hydration: "Data recorded", meals: "Data recorded", mood: "Data recorded", vitals: "Data recorded", symptoms: "Data recorded" },
      recommendations: ["Continue monitoring your daily health metrics", "Maintain consistent sleep schedule", "Stay hydrated throughout the day"],
      concerns: [],
      dietFocus: "Balanced nutrition based on your profile"
    };
  }
};

export const getUserChatContext = async (user) => {
  try {
    const context = user.aiContext || {};
    let ctx = `User Profile: ${user.name}, Age: ${user.age || 'N/A'}, Gender: ${user.gender || 'N/A'}`;

    if (user.diseaseTags?.length) ctx += `\nHealth Conditions: ${user.diseaseTags.join(', ')}`;
    if (user.dietType) ctx += `\nDiet Preference: ${user.dietType}`;
    if (context.healthSummary) ctx += `\n\nRecent Health Status: ${context.healthSummary}`;
    if (context.concerns?.length) ctx += `\nHealth Concerns: ${context.concerns.join(', ')}`;
    if (context.recommendations?.length) ctx += `\nActive Recommendations: ${context.recommendations.slice(0,3).join('; ')}`;

    return ctx;
  } catch (err) {
    console.error("Error getting user chat context:", err);
    return `User: ${user.name}`;
  }
};

export const generateDietRecommendations = async (user, monitoringData, healthAnalysis) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a nutrition AI assistant for HealthSync (Indian cuisine).  

User Profile:
- Name: ${user.name}
- Age: ${user.age || 'N/A'}
- Gender: ${user.gender || 'N/A'}
- Height: ${user.height || 'N/A'} cm
- Weight: ${user.weight || 'N/A'} kg
- Disease Tags: ${user.diseaseTags?.join(', ') || 'None'}
- Diet Type: ${user.dietType || 'Regular'}

Today's Health Data:
- Sleep: ${monitoringData.sleep?.hours || 0}h (quality: ${monitoringData.sleep?.quality || 0}/5)
- Water: ${monitoringData.water?.liters || 0}L
- Mood: ${monitoringData.mood?.score || 0}/5
- Vitals: Sugar ${monitoringData.vitals?.sugar || 'N/A'}, BP ${monitoringData.vitals?.bpHigh || 'N/A'}/${monitoringData.vitals?.bpLow || 'N/A'}
- Symptoms: ${monitoringData.symptoms?.note || 'None'}

Health Analysis:
${healthAnalysis.summary}

Diet Focus:
${healthAnalysis.dietFocus}

Task:
Generate a personalized daily diet plan (breakfast, mid-morning, lunch, evening, dinner) with portions, benefits, Indian foods, and considering health conditions and diet type. Return JSON.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse diet recommendations");

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Error generating diet recommendations:", err);
    return null;
  }
};
