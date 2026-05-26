import axios from "axios";
import fs from "fs";

const HUGGINGFACE_CONFIG = {
  apiKey: process.env.HF_API_KEY,
  modelEndpoint: "https://api-inference.huggingface.co/models/microsoft/resnet-50",
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 2000,
};

const MEDICAL_LABEL_MAPPING = {
  skin_lesion: ["mole", "nevus", "melanoma", "carcinoma", "lesion"],
  rash: ["rash", "erythema", "dermatitis", "eczema"],
  bruise: ["bruise", "contusion", "hematoma"],
  burn: ["burn", "scald", "thermal_injury"],
  inflammation: ["inflammation", "swelling", "edema"],
  wound: ["wound", "laceration", "cut", "abrasion"],
  infection: ["infection", "abscess", "pustule"],
  hand: ["hand", "palm", "finger"],
  foot: ["foot", "toe", "heel"],
  face: ["face", "facial"],
  eye: ["eye", "ocular"],
  mouth: ["mouth", "oral", "lip"],
};

const SEVERITY_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.60,
  LOW: 0.40,
  UNCERTAIN: 0.40,
};

class ResNetMedicalClassifier {
  constructor() {
    this.modelLoaded = false;
    this.requestCount = 0;
    this.lastRequestTime = null;
    this.cache = new Map();
  }

  async initialize() {
    if (!HUGGINGFACE_CONFIG.apiKey) throw new Error("HuggingFace API key not configured");

    try {
      const testResponse = await axios.get(HUGGINGFACE_CONFIG.modelEndpoint, {
        headers: { Authorization: `Bearer ${HUGGINGFACE_CONFIG.apiKey}` },
        timeout: 5000,
      });

      this.modelLoaded = true;
      return { success: true, status: "ready" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async classifyImage(imagePath, options = {}) {
    const cacheKey = `${imagePath}-${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const response = await this._callResNetAPI(imageBuffer, options);
      const processedResults = this._processClassificationResults(response.data);
      const assessment = this._generateMedicalAssessment(processedResults);

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
        model: "ResNet-50 (microsoft/resnet-50)",
        framework: "Hugging Face Transformers",
        results: processedResults,
        assessment,
        metadata: {
          processingTime: response.headers["x-compute-time"] || "N/A",
          modelVersion: response.headers["x-model-version"] || "2.0",
          confidence: this._calculateOverallConfidence(processedResults),
        },
      };

      this.cache.set(cacheKey, result);
      this.requestCount++;
      this.lastRequestTime = new Date();

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fallback: this._generateFallbackAnalysis(),
      };
    }
  }

  async classifyBatch(imagePaths) {
    const results = await Promise.allSettled(imagePaths.map((path) => this.classifyImage(path)));
    return results.map((result, index) => ({
      imagePath: imagePaths[index],
      success: result.status === "fulfilled",
      data: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null,
    }));
  }

  async _callResNetAPI(imageBuffer, options = {}) {
    const maxRetries = options.maxRetries || HUGGINGFACE_CONFIG.maxRetries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await axios.post(HUGGINGFACE_CONFIG.modelEndpoint, imageBuffer, {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_CONFIG.apiKey}`,
            "Content-Type": "application/octet-stream",
          },
          timeout: HUGGINGFACE_CONFIG.timeout,
        });
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) await this._sleep(HUGGINGFACE_CONFIG.retryDelay * attempt);
      }
    }

    throw new Error(`ResNet API call failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  _processClassificationResults(rawResults) {
    if (!Array.isArray(rawResults)) throw new Error("Invalid API response format");

    return rawResults
      .slice(0, 10)
      .map((prediction, index) => ({
        rank: index + 1,
        label: prediction.label,
        confidence: prediction.score,
        confidencePercent: (prediction.score * 100).toFixed(2) + "%",
        medicalCategory: this._mapToMedicalCategory(prediction.label),
        severityLevel: this._assessSeverity(prediction.score),
      }))
      .filter((p) => p.confidence > 0.01);
  }

  _mapToMedicalCategory(label) {
    const normalizedLabel = label.toLowerCase();
    for (const [category, keywords] of Object.entries(MEDICAL_LABEL_MAPPING)) {
      if (keywords.some((keyword) => normalizedLabel.includes(keyword))) return category;
    }
    return "general_observation";
  }

  _assessSeverity(confidence) {
    if (confidence >= SEVERITY_THRESHOLDS.HIGH) return { level: "HIGH", emoji: "🔴", recommendation: "Immediate medical consultation recommended", urgency: 3 };
    if (confidence >= SEVERITY_THRESHOLDS.MEDIUM) return { level: "MEDIUM", emoji: "🟡", recommendation: "Schedule a doctor's appointment", urgency: 2 };
    if (confidence >= SEVERITY_THRESHOLDS.LOW) return { level: "LOW", emoji: "🟢", recommendation: "Monitor condition, self-care may be sufficient", urgency: 1 };
    return { level: "UNCERTAIN", emoji: "❓", recommendation: "Insufficient data for assessment", urgency: 0 };
  }

  _generateMedicalAssessment(results) {
    if (!results || results.length === 0) return this._generateFallbackAnalysis();

    const topPrediction = results[0];
    const medicalFindings = results.filter((r) => r.medicalCategory !== "general_observation");

    return {
      primaryFinding: {
        condition: topPrediction.label,
        confidence: topPrediction.confidencePercent,
        category: topPrediction.medicalCategory,
        severity: topPrediction.severityLevel,
      },
      medicalRelevance: medicalFindings.length > 0 ? "DETECTED" : "NO_FINDINGS",
      relatedFindings: medicalFindings.slice(1, 4).map((f) => ({ condition: f.label, confidence: f.confidencePercent })),
      recommendations: this._generateRecommendations(topPrediction, medicalFindings),
      disclaimer: "⚠️ This is an AI-assisted analysis and should not replace professional medical diagnosis.",
    };
  }

  _generateRecommendations(topPrediction, medicalFindings) {
    const recommendations = [];
    if (topPrediction.severityLevel.urgency >= 2)
      recommendations.push({ priority: "HIGH", action: "Consult a healthcare professional", reason: `Detected ${topPrediction.medicalCategory} with ${topPrediction.confidencePercent} confidence` });

    if (medicalFindings.length > 0)
      recommendations.push({ priority: "MEDIUM", action: "Document and monitor symptoms", reason: "Multiple medical indicators detected" });

    recommendations.push({ priority: "LOW", action: "Maintain detailed health records", reason: "For accurate medical consultation" });

    return recommendations;
  }

  _calculateOverallConfidence(results) {
    if (!results || results.length === 0) return { score: 0, percentage: "0%", qualityRating: "Low" };

    const avg = results.slice(0, 3).reduce((sum, r) => sum + r.confidence, 0) / Math.min(3, results.length);
    const percentage = (avg * 100).toFixed(2) + "%";
    let qualityRating = avg > 0.7 ? "High" : avg > 0.4 ? "Medium" : "Low";
    return { score: avg, percentage, qualityRating };
  }

  _generateFallbackAnalysis() {
    return {
      primaryFinding: { condition: "Unable to classify", confidence: "N/A", category: "unknown", severity: { level: "UNCERTAIN", emoji: "❓", recommendation: "Manual review required", urgency: 0 } },
      medicalRelevance: "UNABLE_TO_ANALYZE",
      recommendations: [{ priority: "HIGH", action: "Consult a healthcare professional", reason: "AI classification unavailable" }],
      disclaimer: "⚠️ Classification service unavailable. Please seek professional medical advice.",
    };
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getStats() {
    return { modelLoaded: this.modelLoaded, totalRequests: this.requestCount, lastRequestTime: this.lastRequestTime, cacheSize: this.cache.size, uptime: process.uptime() };
  }

  clearCache() {
    const sizeBefore = this.cache.size;
    this.cache.clear();
    return { cleared: sizeBefore };
  }
}

const resnetClassifier = new ResNetMedicalClassifier();

export const analyzeImage = async (imagePath, options = {}) => {
  if (!resnetClassifier.modelLoaded) await resnetClassifier.initialize();
  return resnetClassifier.classifyImage(imagePath, options);
};

export const analyzeBatch = async (imagePaths) => {
  if (!resnetClassifier.modelLoaded) await resnetClassifier.initialize();
  return resnetClassifier.classifyBatch(imagePaths);
};

export const getModelStats = () => resnetClassifier.getStats();
export const initializeResNet = async () => resnetClassifier.initialize();
export const clearAnalysisCache = () => resnetClassifier.clearCache();

export default {
  analyzeImage,
  analyzeBatch,
  getModelStats,
  initializeResNet,
  clearAnalysisCache,
  ResNetMedicalClassifier,
};
