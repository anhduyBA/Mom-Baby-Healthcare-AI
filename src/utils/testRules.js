import { evaluateLifestyleRules } from "./lifestyleRulesEngine.js";

const testCases = [
  {
    name: "BR01 - Sleep Warning (Sleep < 6)",
    data: {
      sleepHours: 5,
      studyHours: 4,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 3.5,
      stressLevel: "Low"
    },
    expectedRules: ["BR01"]
  },
  {
    name: "BR02 - High Stress + Overwork (Stress=High, Study > 8)",
    data: {
      sleepHours: 8,
      studyHours: 9,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 3.2,
      stressLevel: "High"
    },
    expectedRules: ["BR02"]
  },
  {
    name: "BR03 - Low Physical Activity (< 1)",
    data: {
      sleepHours: 7.5,
      studyHours: 4,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 0.5,
      gpa: 3.2,
      stressLevel: "Low"
    },
    expectedRules: ["BR03"]
  },
  {
    name: "BR04 - Low GPA + Low Study (GPA < 2.5, Study < 4)",
    data: {
      sleepHours: 8,
      studyHours: 3,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 2.3,
      stressLevel: "Low"
    },
    expectedRules: ["BR04", "BR06"]
  },
  {
    name: "BR05 - Excessive Social (Social > 5, GPA < 2.8)",
    data: {
      sleepHours: 8,
      studyHours: 4,
      extracurricularHours: 1,
      socialHours: 6,
      physicalActivityHours: 2,
      gpa: 2.7,
      stressLevel: "Low"
    },
    expectedRules: ["BR05", "BR06"]
  },
  {
    name: "BR06 - Healthy Lifestyle Badge (Sleep 7-9, Physical >= 1, Stress !== High)",
    data: {
      sleepHours: 8,
      studyHours: 4,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 1.5,
      gpa: 3.2,
      stressLevel: "Moderate"
    },
    expectedRules: ["BR06"]
  },
  {
    name: "BR07 - Academic Burnout (GPA >= 3.5, Stress=High, Sleep < 7)",
    data: {
      sleepHours: 5.5,
      studyHours: 7,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 3.8,
      stressLevel: "High"
    },
    expectedRules: ["BR01", "BR07"] // Sleep < 6 triggers BR01 too
  },
  {
    name: "BR08 - No Extracurricular + High Stress (<0.5, High)",
    data: {
      sleepHours: 8,
      studyHours: 4,
      extracurricularHours: 0.2,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 3.2,
      stressLevel: "High"
    },
    expectedRules: ["BR08"]
  },
  {
    name: "BR09 - Study Hard but Low GPA (Study > 7, GPA < 2.8)",
    data: {
      sleepHours: 8,
      studyHours: 8,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 2.6,
      stressLevel: "Low"
    },
    expectedRules: ["BR06", "BR09"]
  },
  {
    name: "BR10 - Oversleeping (Sleep > 10, Stress !== Low)",
    data: {
      sleepHours: 11,
      studyHours: 4,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 3.2,
      stressLevel: "Moderate"
    },
    expectedRules: ["BR10"]
  },
  {
    name: "BR11 - Social Isolation (Social < 0.5, Study > 8)",
    data: {
      sleepHours: 8,
      studyHours: 9,
      extracurricularHours: 1,
      socialHours: 0.2,
      physicalActivityHours: 2,
      gpa: 3.2,
      stressLevel: "Low"
    },
    expectedRules: ["BR06", "BR11"]
  },
  {
    name: "BR12 - Perfect Balance (Study 5-8, Sleep 7-9, Physical >= 1, Social 1-3, GPA >= 3.0)",
    data: {
      sleepHours: 8,
      studyHours: 6,
      extracurricularHours: 1,
      socialHours: 2,
      physicalActivityHours: 2,
      gpa: 3.5,
      stressLevel: "Low"
    },
    expectedRules: ["BR06", "BR12"] // BR06 (Healthy Lifestyle) is also satisfied!
  }
];

let failed = 0;
console.log("=== STARTING LIFESTYLE RULES ENGINE VERIFICATION ===");
testCases.forEach((tc) => {
  const alerts = evaluateLifestyleRules(tc.data);
  const triggeredIds = alerts.map((a) => a.ruleId);
  
  const allExpectedFound = tc.expectedRules.every((ruleId) => triggeredIds.includes(ruleId));
  const noUnexpectedFound = triggeredIds.every((ruleId) => tc.expectedRules.includes(ruleId));

  if (allExpectedFound && noUnexpectedFound) {
    console.log(`[PASS] ${tc.name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${tc.name}`);
    console.error(`  Expected: ${JSON.stringify(tc.expectedRules)}`);
    console.error(`  Triggered: ${JSON.stringify(triggeredIds)}`);
    console.error(`  Alerts details:`, alerts);
  }
});

console.log("====================================================");
if (failed === 0) {
  console.log("ALL TESTS PASSED SUCCESSFULLY! 🎉");
} else {
  console.error(`${failed} TESTS FAILED.`);
  process.exit(1);
}
