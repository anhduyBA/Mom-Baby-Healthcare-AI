import fs from "fs";
import path from "path";

// In-memory cache for clustering metadata
let clusterCentroids = {};
let minMaxParams = {};
let isInitialized = false;

// Default fallbacks in case initialization fails or is skipped
const DEFAULT_CENTROIDS = {
  "Burned Out": { studyHours: 9.0, extracurricularHours: 2.0, sleepHours: 5.5, socialHours: 2.0, physicalHours: 0.5, gpa: 3.0, stressVal: 3 },
  "Couch Scholar": { studyHours: 6.5, extracurricularHours: 1.5, sleepHours: 7.0, socialHours: 3.0, physicalHours: 0.5, gpa: 2.7, stressVal: 2 },
  "Balanced": { studyHours: 6.0, extracurricularHours: 2.5, sleepHours: 8.0, socialHours: 3.5, physicalHours: 2.0, gpa: 3.2, stressVal: 1.5 },
  "Overachiever": { studyHours: 8.5, extracurricularHours: 3.0, sleepHours: 6.0, socialHours: 2.0, physicalHours: 1.5, gpa: 3.8, stressVal: 3 }
};

const DEFAULT_MIN_MAX = {
  studyHours: { min: 5.0, max: 10.0 },
  extracurricularHours: { min: 0.0, max: 5.0 },
  sleepHours: { min: 5.0, max: 10.0 },
  socialHours: { min: 0.0, max: 7.0 },
  physicalHours: { min: 0.0, max: 13.0 },
  gpa: { min: 2.0, max: 4.0 },
  stressVal: { min: 1, max: 3 }
};

export function initProfileClustering() {
  // Stubbed out for maternity care pivot
  console.log("K-Means student profiles clustering disabled - pivoted to Mom Ơi!");
}

import { classifyMaternalProfile } from "./profileClassifier.js";

export function classifyStudentProfile(studentData) {
  const profile = classifyMaternalProfile(studentData);
  return profile.profileName;
}
