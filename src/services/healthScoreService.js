/**
 * Calculates a student's health score (0-100) based on weighted lifestyle components.
 * @param {Object} data - Student metrics: studyHours, sleepHours, physicalHours, socialHours, gpa.
 * @returns {number} Health score integer between 0 and 100.
 */
export function calculateHealthScore(data) {
  const studyHours = Number(data.studyHours ?? data.study ?? 0);
  const sleepHours = Number(data.sleepHours ?? data.sleep ?? 0);
  const physicalHours = Number(data.physicalHours ?? data.physicalActivityHours ?? data.physical ?? 0);
  const socialHours = Number(data.socialHours ?? data.social ?? 0);
  const gpa = Number(data.gpa ?? data.GPA ?? 0);

  // 1. Sleep Score (25%): 100 if 7-9h, deduct proportionally outside range
  let sleepScore = 100;
  if (sleepHours < 7) {
    sleepScore = Math.max(0, (sleepHours / 7) * 100);
  } else if (sleepHours > 9) {
    sleepScore = Math.max(0, 100 - (sleepHours - 9) * 20);
  }

  // 2. Study Score (20%): 100 if 5-8h, deduct proportionally outside range
  let studyScore = 100;
  if (studyHours < 5) {
    studyScore = Math.max(0, (studyHours / 5) * 100);
  } else if (studyHours > 8) {
    studyScore = Math.max(0, 100 - (studyHours - 8) * 15);
  }

  // 3. Physical Score (20%): 100 if >= 1h, 0 if < 0.3h, linear interpolation in between
  let physicalScore = 0;
  if (physicalHours >= 1) {
    physicalScore = 100;
  } else if (physicalHours >= 0.3) {
    physicalScore = ((physicalHours - 0.3) / 0.7) * 100;
  }

  // 4. Social Score (15%): 100 if 1-3h, deduct proportionally outside range
  let socialScore = 100;
  if (socialHours < 1) {
    socialScore = Math.max(0, socialHours * 100);
  } else if (socialHours > 3) {
    socialScore = Math.max(0, 100 - (socialHours - 3) * 25);
  }

  // 5. GPA Score (20%): map 2.0-4.0 -> 0-100
  let gpaScore = 0;
  if (gpa >= 4.0) {
    gpaScore = 100;
  } else if (gpa > 2.0) {
    gpaScore = ((gpa - 2.0) / 2.0) * 100;
  }

  const finalScore = (
    sleepScore * 0.25 +
    studyScore * 0.20 +
    physicalScore * 0.20 +
    socialScore * 0.15 +
    gpaScore * 0.20
  );

  return Math.round(finalScore);
}
