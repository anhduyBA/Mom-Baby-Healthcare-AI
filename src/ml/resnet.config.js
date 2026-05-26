export const RESNET_CONFIG = {
  api: {
    provider: "HuggingFace",
    endpoint: "https://api-inference.huggingface.co/models/microsoft/resnet-50",
    timeout: parseInt(process.env.RESNET_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.RESNET_MAX_RETRIES) || 3,
    retryDelay: 2000,
  },

  severity: {
    thresholds: {
      HIGH: 0.85,
      MEDIUM: 0.60,
      LOW: 0.40,
      UNCERTAIN: 0.40,
    },
    consultationDeadlines: {
      HIGH: 2,
      MEDIUM: 24,
      LOW: 168,
      UNCERTAIN: null,
    },
  },

  imageProcessing: {
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10,
    recommendedSize: { width: 224, height: 224 },
    autoResize: true,
    quality: 85,
  },

  medicalMapping: {
    categories: {
      "skin_lesion": { keywords: ["mole","nevus","melanoma","carcinoma","lesion","spot"], priority: "HIGH", specialistRequired: "dermatologist", description: "Abnormal skin growth or discoloration" },
      "rash": { keywords: ["rash","erythema","dermatitis","eczema","hives"], priority: "MEDIUM", specialistRequired: "dermatologist", description: "Skin irritation or inflammation" },
      "bruise": { keywords: ["bruise","contusion","hematoma","ecchymosis"], priority: "LOW", specialistRequired: null, description: "Skin discoloration from trauma" },
      "burn": { keywords: ["burn","scald","thermal_injury","blister"], priority: "HIGH", specialistRequired: "emergency_medicine", description: "Thermal or chemical skin damage" },
      "inflammation": { keywords: ["inflammation","swelling","edema","cellulitis"], priority: "MEDIUM", specialistRequired: "general_practitioner", description: "Tissue swelling and redness" },
      "wound": { keywords: ["wound","laceration","cut","abrasion","ulcer"], priority: "MEDIUM", specialistRequired: "general_practitioner", description: "Break in skin integrity" },
      "infection": { keywords: ["infection","abscess","pustule","pus","sepsis"], priority: "HIGH", specialistRequired: "infectious_disease", description: "Bacterial or viral infection" },
    },
    bodyParts: {
      "hand": ["hand","palm","finger","wrist"],
      "foot": ["foot","toe","heel","ankle"],
      "face": ["face","facial","cheek","forehead"],
      "eye": ["eye","ocular","eyelid"],
      "mouth": ["mouth","oral","lip","tongue"],
      "arm": ["arm","elbow","forearm"],
      "leg": ["leg","thigh","calf","knee"],
      "torso": ["chest","abdomen","back","torso"],
    },
  },

  performance: {
    enableCache: true,
    cacheTTL: 3600,
    maxCacheSize: 1000,
    enableBatch: true,
    maxBatchSize: 10,
    maxConcurrent: 3,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logResults: true,
    logApiCalls: true,
    logErrors: true,
    saveHistory: false,
    historyPath: './logs/resnet-classifications.json',
  },

  recommendations: {
    autoGenerate: true,
    includeGeneralAdvice: true,
    templates: {
      HIGH_SEVERITY: ["Seek immediate medical attention","Visit emergency room or urgent care","Do not delay treatment","Contact your healthcare provider immediately"],
      MEDIUM_SEVERITY: ["Schedule a doctor's appointment within 24 hours","Consult a healthcare professional","Monitor symptoms closely","Take photos to track progression"],
      LOW_SEVERITY: ["Monitor the condition","Self-care may be sufficient","Contact doctor if symptoms worsen","Document any changes"],
      UNCERTAIN: ["Unable to determine severity","Professional medical evaluation recommended","Provide more information to your doctor","Consider getting a second opinion"],
    },
  },

  alerts: {
    autoTrigger: true,
    minSeverityForAlert: "MEDIUM",
    channels: {
      HIGH: ["email","sms","app"],
      MEDIUM: ["email","app"],
      LOW: ["app"],
      UNCERTAIN: ["app"],
    },
    templates: {
      HIGH: "🚨 URGENT: High-severity medical condition detected. Seek immediate medical attention.",
      MEDIUM: "⚠️ ATTENTION: Medical condition detected. Please consult a healthcare professional.",
      LOW: "ℹ️ INFO: Minor condition detected. Monitor and track your symptoms.",
    },
  },

  compliance: {
    includeDisclaimers: true,
    disclaimer: "⚠️ This is an AI-assisted analysis and should not replace professional medical diagnosis. Always consult a qualified healthcare provider for medical advice.",
    hipaaMode: false,
    storePatientData: false,
    anonymizeResults: true,
  },

  development: {
    debug: process.env.NODE_ENV !== 'production',
    useMockResponses: false,
    mockDelay: 1000,
    verbose: false,
    saveApiResponses: false,
    apiResponsePath: './debug/api-responses',
  },

  features: {
    enableImageAnalysis: true,
    enableMedicalMapping: true,
    enableSeverityAssessment: true,
    enableRecommendations: true,
    enableBatchProcessing: true,
    enableCaching: true,
    enableAutoRetry: true,
    enableFallback: true,
  },
};

if (process.env.NODE_ENV === 'production') {
  RESNET_CONFIG.logging.level = 'warn';
  RESNET_CONFIG.development.debug = false;
  RESNET_CONFIG.development.verbose = false;
  RESNET_CONFIG.compliance.hipaaMode = true;
  RESNET_CONFIG.performance.maxConcurrent = 5;
}

if (process.env.NODE_ENV === 'development') {
  RESNET_CONFIG.logging.level = 'debug';
  RESNET_CONFIG.development.verbose = true;
  RESNET_CONFIG.performance.enableCache = false;
}

if (process.env.NODE_ENV === 'test') {
  RESNET_CONFIG.api.timeout = 5000;
  RESNET_CONFIG.development.useMockResponses = true;
  RESNET_CONFIG.alerts.autoTrigger = false;
}

export const validateConfig = () => {
  const errors = [];
  if (!process.env.HF_API_KEY && !RESNET_CONFIG.development.useMockResponses) {
    errors.push('HF_API_KEY environment variable is required');
  }
  const { HIGH, MEDIUM, LOW } = RESNET_CONFIG.severity.thresholds;
  if (HIGH <= MEDIUM || MEDIUM <= LOW) {
    errors.push('Severity thresholds must be in descending order');
  }
  if (RESNET_CONFIG.performance.maxCacheSize < 10) {
    errors.push('maxCacheSize should be at least 10 entries');
  }
  return { isValid: errors.length === 0, errors };
};

export default RESNET_CONFIG;
export const { api, severity, imageProcessing, medicalMapping, performance } = RESNET_CONFIG;
