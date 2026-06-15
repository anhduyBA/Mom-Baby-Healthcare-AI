import RuleThreshold from "../models/RuleThreshold.js";
import DailyMonitoring from "../models/DailyMonitoring.js";

/**
 * Default thresholds for Mom Ơi! evaluation rules.
 */
const DEFAULT_THRESHOLDS = {
  BR01: { cycleMin: 11, cycleMax: 16 },
  BR02: { unsafeFoods: ["sushi", "raw meat", "thịt sống", "cá sống", "rượu", "bia", "cồn", "dứa", "khóm", "thơm", "rau ngót", "măng"] },
  BR03: { stepsMin: 3000 },
  BR04: { weightGainMin: 0.2, weightGainMax: 0.9 },
  BR05: { epdsThreshold: 13 },
  BR06: { weaningAgeMin: 6 },
  BR07: { ironAgeMin: 6, ironAgeMax: 12, ironMin: 11 },
  BR08: { textureProgressionAgeMin: 9, textureProgressionAgeMax: 11 },
  BR09: { allergyWindowHours: 24 },
  BR10: { omegaAgeMin: 12, omegaAgeMax: 24, fishServingsMin: 2 }
};

/**
 * Load thresholds from RuleThresholds and merge with defaults.
 * @returns {Promise<Object>}
 */
async function loadThresholds() {
  const merged = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));
  try {
    const dbThresholds = await RuleThreshold.find({});
    for (const item of dbThresholds) {
      if (merged[item.ruleId]) {
        merged[item.ruleId] = { ...merged[item.ruleId], ...item.thresholds };
      }
    }
  } catch (err) {
    console.error("Error loading thresholds, using defaults:", err);
  }
  return merged;
}

/**
 * Evaluates DailyMonitoring data against the 10 Mom Ơi! Business Rules.
 * @param {Object} data - Daily monitoring entry.
 * @param {Object} user - User document containing stage and baby info.
 * @returns {Promise<Array>} List of triggered alerts.
 */
export async function evaluateBusinessRules(data, user) {
  if (!user) return [];

  const stage = user.pregnancyStage || "pre-natal";
  const pregnancyWeek = Number(user.pregnancyWeek || 0);
  
  // Calculate baby age in months
  let babyAgeMonths = 0;
  if (user.babyBirthDate) {
    const diffTime = Math.abs(new Date() - new Date(user.babyBirthDate));
    babyAgeMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.43));
  }

  // Daily monitoring inputs
  const steps = Number(data.steps ?? 0);
  const epdsScore = Number(data.epdsScore ?? 0);
  const babyIronInput = Number(data.babyIronInput ?? 0);
  const babyFoodTexture = data.babyFoodTexture || "";
  const babyFishServings = Number(data.babyFishServings ?? 0);
  const conceptionDayOfCycle = Number(data.conceptionDayOfCycle ?? 0);
  const allergySymptomLogged = !!data.allergySymptomLogged;
  const newFoodLogged = data.newFoodLogged || "";

  const t = await loadThresholds();
  const alerts = [];
  const now = new Date();

  // Helper to trigger alert
  const trigger = (ruleId, severity, title, message, suggestion) => {
    alerts.push({ ruleId, severity, title, message, suggestion, triggeredAt: now });
  };

  // BR01 — Fertility window alert
  if (stage === "pre-natal" && conceptionDayOfCycle >= t.BR01.cycleMin && conceptionDayOfCycle <= t.BR01.cycleMax) {
    trigger(
      "BR01",
      "POSITIVE",
      "Cửa sổ thụ thai lý tưởng",
      `Hôm nay là ngày thứ ${conceptionDayOfCycle} của chu kỳ. Bạn đang nằm trong khoảng thời gian dễ thụ thai nhất.`,
      "Lên lịch sinh hoạt vợ chồng đều đặn 2 ngày/lần. Duy trì bổ sung sắt và acid folic 400mcg hàng ngày."
    );
  }

  // BR02 — Gen Z food warning during pregnancy
  if (stage === "pregnant" && data.meals) {
    // Collect all foods logged today or keywords in meal names
    const mealNotes = [];
    if (data.mood?.note) mealNotes.push(data.mood.note.toLowerCase());
    if (data.symptoms?.note) mealNotes.push(data.symptoms.note.toLowerCase());
    
    // Check meal fields if logged as food text
    if (typeof data.meals === "object") {
      Object.values(data.meals).forEach(val => {
        if (typeof val === "string") mealNotes.push(val.toLowerCase());
      });
    }

    const foundUnsafe = t.BR02.unsafeFoods.filter(food => 
      mealNotes.some(note => note.includes(food))
    );

    if (foundUnsafe.length > 0) {
      trigger(
        "BR02",
        "HIGH",
        "Cảnh báo thực phẩm thai kỳ",
        `Phát hiện thực phẩm không khuyến nghị cho phụ nữ mang thai trong nhật ký của bạn: ${foundUnsafe.join(", ")}.`,
        "Tránh tuyệt đối thức ăn sống/tái, sữa chưa tiệt trùng, rượu bia và các loại rau có nguy cơ gây co bóp tử cung (như rau ngót, mướp đắng)."
      );
    }
  }

  // BR03 — Safe exercise during pregnancy
  if (stage === "pregnant" && steps > 0 && steps < t.BR03.stepsMin) {
    trigger(
      "BR03",
      "MEDIUM",
      "Khuyến khích vận động nhẹ nhàng",
      `Hôm nay bạn đi được ${steps} bước, thấp hơn khuyến cáo ${t.BR03.stepsMin} bước/ngày cho thai phụ.`,
      "Thực hiện 15-20 phút đi bộ chậm rãi hoặc tập các động tác yoga bầu cơ bản giúp cải thiện tuần hoàn và giảm mệt mỏi."
    );
  }

  // BR04 — Pregnancy weight gain monitoring
  if (stage === "pregnant" && data.vitals?.weight) {
    try {
      // Find weight logged ~7 days ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 8);
      const prevEntry = await DailyMonitoring.findOne({
        userId: user._id,
        date: { $gte: oneWeekAgo, $lt: now },
        "vitals.weight": { $exists: true, $ne: null }
      }).sort({ date: 1 }); // oldest first to find closest to 7 days ago

      if (prevEntry && prevEntry.vitals?.weight) {
        const weightDiff = data.vitals.weight - prevEntry.vitals.weight;
        // Check if gain is outside [0.2, 0.9] kg/week
        if (weightDiff > t.BR04.weightGainMax) {
          trigger(
            "BR04",
            "HIGH",
            "Cân nặng tăng quá nhanh",
            `Mức tăng cân của bạn là ${weightDiff.toFixed(2)} kg trong tuần qua, vượt quá khuyến cáo tối đa ${t.BR04.weightGainMax} kg/tuần.`,
            "Hạn chế tinh bột tinh chế, đồ ngọt và nước có ga. Tập trung vào thực phẩm giàu chất xơ, đạm lành mạnh và tham khảo bác sĩ sản khoa."
          );
        } else if (weightDiff >= 0 && weightDiff < t.BR04.weightGainMin) {
          trigger(
            "BR04",
            "MEDIUM",
            "Cân nặng tăng chậm hơn kỳ vọng",
            `Mức tăng cân của bạn là ${weightDiff.toFixed(2)} kg trong tuần qua, thấp hơn khuyến cáo tối thiểu ${t.BR04.weightGainMin} kg/tuần.`,
            "Hãy đảm bảo ăn đủ 3 bữa chính và bổ sung 1-2 bữa phụ với hạt dinh dưỡng, sữa hoặc trái cây để cung cấp đủ dưỡng chất cho thai nhi."
          );
        }
      }
    } catch (err) {
      console.error("Error in weight gain rules check:", err);
    }
  }

  // BR05 — EPDS postpartum depression detection
  if (epdsScore >= t.BR05.epdsThreshold) {
    trigger(
      "BR05",
      "HIGH",
      "Cảnh báo Trầm cảm sau sinh (EPDS)",
      `Điểm số tầm soát EPDS của bạn là ${epdsScore}/30, thuộc nhóm có nguy cơ trầm cảm cao cần được hỗ trợ chuyên khoa.`,
      "Đừng ngần ngại chia sẻ cảm xúc với chồng hoặc người thân. Hãy sử dụng tính năng Chat VIP để kết nối với bác sĩ tâm lý của Mom Ơi!."
    );
  }

  // BR06 — Baby weaning start alert
  if (stage === "post-natal" && babyAgeMonths >= t.BR06.weaningAgeMin && babyFoodTexture.toLowerCase() === "puree") {
    // Checking if baby has reached 6 months and is starting puree
    trigger(
      "BR06",
      "POSITIVE",
      "Bắt đầu hành trình ăn dặm",
      `Bé đã được ${babyAgeMonths} tháng tuổi và đang làm quen với thức ăn nhuyễn mịn (puree).`,
      "Khởi đầu với lượng nhỏ (1-2 thìa cháo rây loãng hoặc bột ăn dặm), ăn 1 cữ/ngày để bé làm quen với phản xạ nuốt thức ăn thô."
    );
  }

  // BR07 — Baby iron deficiency
  if (stage === "post-natal" && babyAgeMonths >= t.BR07.ironAgeMin && babyAgeMonths <= t.BR07.ironAgeMax && babyIronInput > 0 && babyIronInput < t.BR07.ironMin) {
    trigger(
      "BR07",
      "HIGH",
      "Nguy cơ thiếu sắt ở bé",
      `Lượng sắt nạp vào của bé là ${babyIronInput} mg/ngày, thấp hơn nhu cầu khuyến khuyến nghị ${t.BR07.ironMin} mg/ngày cho trẻ 6-12 tháng.`,
      "Tăng cường cháo ăn dặm với thực phẩm giàu sắt như thịt bò, lòng đỏ trứng, gan gà, yến mạch hoặc sử dụng siro bổ sung sắt theo chỉ định y tế."
    );
  }

  // BR08 — Texture progression
  if (stage === "post-natal" && babyAgeMonths >= t.BR08.textureProgressionAgeMin && babyAgeMonths <= t.BR08.textureProgressionAgeMax && babyFoodTexture.toLowerCase() === "puree") {
    trigger(
      "BR08",
      "MEDIUM",
      "Chuyển đổi cấu trúc ăn dặm",
      `Bé đã ${babyAgeMonths} tháng tuổi nhưng vẫn đang ăn đồ nhuyễn mịn (puree). Bé cần nâng cấp cấu trúc thô để tập nhai.`,
      "Bắt đầu chuyển dần sang cháo đặc hạt vỡ, thịt băm nhỏ hoặc rau củ hấp chín mềm cắt nhỏ để bé rèn luyện phản xạ nhai và nuốt thô."
    );
  }

  // BR09 — Baby food allergy detection
  if (stage === "post-natal" && allergySymptomLogged && newFoodLogged) {
    trigger(
      "BR09",
      "HIGH",
      "Nghi ngờ dị ứng thực phẩm ở bé",
      `Bé xuất hiện triệu chứng dị ứng (mẩn ngứa, nôn trớ, quấy khóc) sau khi thử thực phẩm mới: ${newFoodLogged}.`,
      "Hãy loại bỏ thực phẩm này ra khỏi thực đơn ngay lập tức. Theo dõi sát biểu hiện da, nhịp thở và đưa bé đi khám nếu triệu chứng nặng lên."
    );
  }

  // BR10 — Omega-3 for brain development
  if (stage === "post-natal" && babyAgeMonths >= t.BR10.omegaAgeMin && babyAgeMonths <= t.BR10.omegaAgeMax && babyFishServings > 0 && babyFishServings < t.BR10.fishServingsMin) {
    trigger(
      "BR10",
      "MEDIUM",
      "Thiếu hụt Omega-3 cho bé",
      `Bé chỉ ăn ${babyFishServings} bữa cá béo trong tuần qua (khuyến cáo tối thiểu là ${t.BR10.fishServingsMin} bữa/tuần).`,
      "Bổ sung cá hồi, cá tuyết, cá thu hoặc hạt chia vào thực đơn ăn dặm để hỗ trợ phát triển tối ưu não bộ và thị lực cho trẻ."
    );
  }

  // Sort by severity (HIGH first, then MEDIUM, then POSITIVE)
  const severityOrder = { HIGH: 1, MEDIUM: 2, POSITIVE: 3 };
  alerts.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

  return alerts;
}
