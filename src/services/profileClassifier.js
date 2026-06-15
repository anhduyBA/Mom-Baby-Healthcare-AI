/**
 * Classifies a student's daily lifestyle data into one of 4 profiles
 * and defines their prioritised nutritional needs.
 * 
 * @param {object} data - Student lifestyle metrics.
 * @param {number} data.studyHours - Hours spent studying per day.
 * @param {number} data.sleepHours - Hours spent sleeping per day.
 * @param {number} data.physicalHours - Hours spent doing physical activity per day.
 * @param {number} data.gpa - Current Grade Point Average.
 * @param {string} data.stressLevel - Reported stress level ("Low" | "Moderate" | "High").
 * @returns {{ profileId: string, profileName: string, nutritionNeeds: string[] }} Classified profile object.
 */
export function classifyMaternalProfile(data) {
  const stage = data.pregnancyStage || "pre-natal";

  if (stage === "pre-natal") {
    return {
      profileId: "pre-natal",
      profileName: "Mom Khởi Đầu (Chuẩn bị mang thai)",
      nutritionNeeds: ["fertility-boosting", "folic-acid", "antioxidants", "healthy-weight", "easy-to-cook"]
    };
  }

  if (stage === "pregnant") {
    return {
      profileId: "pregnant",
      profileName: "Mom Hiện Đại (Trong thai kỳ)",
      nutritionNeeds: ["prenatal-nutrition", "iron-rich", "calcium-rich", "fiber-rich", "pregnancy-safe"]
    };
  }

  if (stage === "post-natal") {
    return {
      profileId: "post-natal",
      profileName: "Super Mom VIP (Sau sinh & Chăm bé)",
      nutritionNeeds: ["postpartum-recovery", "lactation-support", "omega-3", "easy-to-digest", "energy-boosting"]
    };
  }

  return {
    profileId: "pre-natal",
    profileName: "Mom Khởi Đầu (Chuẩn bị mang thai)",
    nutritionNeeds: ["fertility-boosting", "folic-acid", "antioxidants", "healthy-weight", "easy-to-cook"]
  };
}

export const classifyStudentProfile = classifyMaternalProfile;
