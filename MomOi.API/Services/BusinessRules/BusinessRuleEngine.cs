using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MomOi.API.Data;
using MomOi.API.Hubs;
using MomOi.API.Models.Health;
using MomOi.API.Models.Nutrition;
using MomOi.API.Services.AI;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MomOi.API.Services.BusinessRules
{
    /// <summary>
    /// Implements health scoring, calorie calculations, and baby growth verification algorithms.
    /// </summary>
    public class BusinessRuleEngine : IBusinessRuleEngine
    {
        private readonly AppDbContext? _context;
        private readonly IGeminiService? _geminiService;
        private readonly IHubContext<AlertHub>? _hubContext;
        private readonly ILogger<BusinessRuleEngine>? _logger;

        public BusinessRuleEngine(
            AppDbContext? context = null, 
            IGeminiService? geminiService = null, 
            IHubContext<AlertHub>? hubContext = null,
            ILogger<BusinessRuleEngine>? logger = null)
        {
            _context = context;
            _geminiService = geminiService;
            _hubContext = hubContext;
            _logger = logger;
        }

        #region Legacy Rule Methods

        public float CalculateCalorieTarget(float bmi, JourneyStage stage, bool isBreastfeeding)
        {
            float target = 2000f;

            if (bmi < 18.5f)
            {
                target += 300f;
            }
            else if (bmi >= 25.0f && bmi < 30.0f)
            {
                target -= 150f;
            }
            else if (bmi >= 30.0f)
            {
                target -= 300f;
            }

            switch (stage)
            {
                case JourneyStage.Pregnant:
                    target += 350f;
                    break;
                case JourneyStage.Postpartum:
                    if (isBreastfeeding)
                    {
                        target += 500f;
                    }
                    break;
            }

            return target;
        }

        public EpdsEvaluationResult EvaluateEpdsScore(int[] answers)
        {
            if (answers == null || answers.Length != 10)
            {
                throw new ArgumentException("Bảng đánh giá EPDS phải có đúng 10 câu trả lời.");
            }

            if (answers.Any(a => a < 0 || a > 3))
            {
                throw new ArgumentException("Điểm mỗi câu trả lời EPDS phải nằm trong khoảng từ 0 đến 3.");
            }

            int score = answers.Sum();
            var result = new EpdsEvaluationResult
            {
                TotalScore = score,
                IsUrgent = score >= 13
            };

            if (score >= 13)
            {
                result.RiskLevel = "High";
                result.Recommendation = "Bạn có nguy cơ trầm cảm sau sinh rất cao. Vui lòng liên hệ với chuyên gia tâm lý hoặc bác sĩ chuyên khoa ngay lập tức để được tư vấn và hỗ trợ.";
            }
            else if (score >= 9)
            {
                result.RiskLevel = "Moderate";
                result.Recommendation = "Bạn có các dấu hiệu trầm cảm nhẹ. Hãy chia sẻ với người thân, nghỉ ngơi nhiều hơn và thực hiện lại bài kiểm tra sau 1-2 tuần.";
            }
            else
            {
                result.RiskLevel = "Low";
                result.Recommendation = "Tâm lý của bạn đang ổn định. Hãy tiếp tục duy trì lối sống lành mạnh và chia sẻ cùng gia đình.";
            }

            return result;
        }

        public GrowthEvaluationResult VerifyBabyGrowth(int ageMonths, string gender, float weightKg, float heightCm)
        {
            if (ageMonths < 0)
            {
                throw new ArgumentException("Tuổi của bé không thể âm.");
            }

            float expectedWeight = 3.2f + (ageMonths * 0.6f);
            float expectedHeight = 50.0f + (ageMonths * 2.0f);

            if (string.Equals(gender, "male", StringComparison.OrdinalIgnoreCase))
            {
                expectedWeight += 0.2f;
                expectedHeight += 0.8f;
            }
            else
            {
                expectedWeight -= 0.2f;
                expectedHeight -= 0.8f;
            }

            var result = new GrowthEvaluationResult();

            float minWeight = expectedWeight * 0.85f;
            float maxWeight = expectedWeight * 1.15f;

            if (weightKg < minWeight)
            {
                result.WeightStatus = "Underweight";
            }
            else if (weightKg > maxWeight)
            {
                result.WeightStatus = "Overweight";
            }
            else
            {
                result.WeightStatus = "Normal";
            }

            float minHeight = expectedHeight * 0.95f;
            float maxHeight = expectedHeight * 1.05f;

            if (heightCm < minHeight)
            {
                result.HeightStatus = "Short";
            }
            else if (heightCm > maxHeight)
            {
                result.HeightStatus = "Tall";
            }
            else
            {
                result.HeightStatus = "Normal";
            }

            result.IsHealthy = (result.WeightStatus == "Normal" && result.HeightStatus == "Normal");

            if (result.IsHealthy)
            {
                result.Feedback = "Bé đang phát triển rất tốt và nằm trong phạm vi chuẩn. Hãy tiếp tục duy trì chế độ dinh dưỡng hiện tại.";
            }
            else
            {
                var issues = new List<string>();
                if (result.WeightStatus == "Underweight") issues.Add("nhẹ cân");
                if (result.WeightStatus == "Overweight") issues.Add("thừa cân");
                if (result.HeightStatus == "Short") issues.Add("thấp chiều cao");
                if (result.HeightStatus == "Tall") issues.Add("vượt trội về chiều cao");

                result.Feedback = $"Bé có dấu hiệu {string.Join(" và ", issues)} so với chuẩn tuổi. Bạn nên tham khảo ý kiến bác sĩ dinh dưỡng để có chế độ chăm sóc tối ưu hơn.";
            }

            return result;
        }

        #endregion

        #region Mother Rules (BR01 - BR05)

        public async Task<List<HealthAlert>> EvaluateAsync(MomHealthProfile profile)
        {
            var alerts = new List<HealthAlert>();
            var today = DateTime.UtcNow.Date;

            // ── BR01 — Fertility Window Alert ──────────────────────────────────
            if (profile.Stage == JourneyStage.PrePregnancy && profile.LastPeriodDate.HasValue)
            {
                int avgCycle = profile.AvgCycleLength ?? 28;
                int cycleDay = (today - profile.LastPeriodDate.Value.Date).Days + 1;
                int startWindow = avgCycle - 16;
                int endWindow = avgCycle - 12;

                if (cycleDay >= startWindow && cycleDay <= endWindow)
                {
                    var alert = new HealthAlert(
                        RuleId: "BR01",
                        Severity: AlertSeverity.Critical,
                        TitleVi: "Cửa sổ thụ thai tối ưu đang mở 🌸",
                        MessageVi: "Mami đang ở trong giai đoạn dễ thụ thai nhất của chu kỳ rồi nè.",
                        SuggestionVi: "Gợi ý: Hãy lên kế hoạch sinh hoạt vợ chồng vào các ngày D-1, D, D+1 (trước rụng trứng 1 ngày, ngày rụng trứng và sau rụng trứng 1 ngày) để tăng cơ hội mang thai thành công nhé.",
                        TriggeredAt: DateTime.UtcNow
                    );
                    alerts.Add(alert);
                    await LogAlertAndPushAsync(profile.UserId, alert);
                }
            }

            // ── BR02 — Gen Z Food Warning (Pregnancy) ──────────────────────────
            if (profile.Stage == JourneyStage.Pregnant && _context != null)
            {
                var todayMeals = await _context.MealLogs
                    .Where(m => m.UserId == profile.UserId && m.LoggedAt.Date == today)
                    .ToListAsync();

                var dangerousKeywords = new[] { "sushi", "tái", "gỏi", "rượu", "trà đặc", "dứa", "ổi xanh", "gan sống" };
                string? detectedFood = null;

                foreach (var meal in todayMeals)
                {
                    foreach (var food in meal.FoodItems)
                    {
                        if (dangerousKeywords.Any(k => food.Contains(k, StringComparison.OrdinalIgnoreCase)))
                        {
                            detectedFood = food;
                            break;
                        }
                    }
                    if (detectedFood != null) break;
                }

                if (detectedFood != null)
                {
                    string warningMessage = "Mami ơi, món ăn có nguy cơ không tốt cho thai kỳ nha. Né gấp nè 💙.";
                    if (_geminiService != null)
                    {
                        warningMessage = await _geminiService.GenerateGenZWarningAsync(detectedFood, profile.PregnancyWeek ?? 1);
                    }

                    var alert = new HealthAlert(
                        RuleId: "BR02",
                        Severity: AlertSeverity.Critical,
                        TitleVi: "Ét o ét! Món này hổng ổn nha mami 🙅‍♀️",
                        MessageVi: warningMessage,
                        SuggestionVi: "Gợi ý: Tránh đồ ăn sống, tái hoặc cồn. Hãy thay thế bằng một đĩa phở bò chín kỹ thơm ngon nghi ngút khói hoặc cháo tôm chín nhừ mami nhé 💙.",
                        TriggeredAt: DateTime.UtcNow
                    );
                    alerts.Add(alert);
                    await LogAlertAndPushAsync(profile.UserId, alert);
                }
            }

            // ── BR03 — Exercise Alert (Pregnancy) ──────────────────────────────
            if (profile.Stage == JourneyStage.Pregnant && profile.PregnancyWeek.HasValue && profile.PregnancyWeek <= 36 && _context != null)
            {
                var todaySteps = await _context.ExerciseLogs
                    .Where(e => e.UserId == profile.UserId && e.RecordedAt.Date == today)
                    .SumAsync(e => e.StepCount);

                var lastExerciseLog = await _context.ExerciseLogs
                    .Where(e => e.UserId == profile.UserId && e.RecordedAt.Date < today && (e.StepCount > 0 || e.DurationMinutes > 0))
                    .OrderByDescending(e => e.RecordedAt)
                    .FirstOrDefaultAsync();

                int daysSinceLastExercise = 99;
                if (lastExerciseLog != null)
                {
                    daysSinceLastExercise = (today - lastExerciseLog.RecordedAt.Date).Days;
                }

                if (todaySteps < 3000 && daysSinceLastExercise > 2)
                {
                    string suggestion = "Hãy vận động nhẹ nhàng.";
                    int week = profile.PregnancyWeek.Value;
                    if (week >= 1 && week <= 12)
                    {
                        suggestion = "Tam cá nguyệt 1: Mami tập yoga nhẹ, hoặc đi bộ thong thả khoảng 20 phút nhé.";
                    }
                    else if (week >= 13 && week <= 27)
                    {
                        suggestion = "Tam cá nguyệt 2: Bơi lội hoặc tập pilates nhẹ nhàng rất phù hợp đó mami.";
                    }
                    else if (week >= 28 && week <= 40)
                    {
                        suggestion = "Tam cá nguyệt 3: Hãy đi bộ nhẹ nhàng 15 phút và tập thở sâu chuẩn bị sinh mami nhé.";
                    }

                    var alert = new HealthAlert(
                        RuleId: "BR03",
                        Severity: AlertSeverity.Warning,
                        TitleVi: "Bạn chưa vận động hôm nay 💪",
                        MessageVi: "Mami đã không tập luyện tích cực hơn 2 ngày và hôm nay chưa đi đủ 3000 bước.",
                        SuggestionVi: suggestion,
                        TriggeredAt: DateTime.UtcNow
                    );
                    alerts.Add(alert);
                    await LogAlertAndPushAsync(profile.UserId, alert);
                }
            }

            // ── BR04 — Pregnancy Weight Monitoring ────────────────────────────
            if (profile.Stage == JourneyStage.Pregnant && profile.PregnancyWeek.HasValue && profile.PregnancyWeek > 12 && _context != null)
            {
                var recentLogs = await _context.PregnancyLogs
                    .Where(p => p.UserId == profile.UserId && p.Weight.HasValue)
                    .OrderByDescending(p => p.RecordedAt)
                    .Take(2)
                    .ToListAsync();

                if (recentLogs.Count == 2)
                {
                    float weightDiff = recentLogs[0].Weight!.Value - recentLogs[1].Weight!.Value;
                    int days = (recentLogs[0].RecordedAt.Date - recentLogs[1].RecordedAt.Date).Days;
                    float weeklyGain = days > 0 ? (weightDiff / days) * 7 : weightDiff;

                    if (weeklyGain > 0.9f || weeklyGain < 0.2f)
                    {
                        string suggestion = weeklyGain > 0.9f
                            ? "Gợi ý dinh dưỡng: Mami hãy giảm bớt tinh bột tinh chế, giảm đồ ngọt và tăng cường rau xanh."
                            : "Gợi ý dinh dưỡng: Bổ sung thực phẩm giàu đạm (thịt nạc, cá, trứng), uống sữa bầu và liên hệ bác sĩ nếu cần thiết.";

                        var alert = new HealthAlert(
                            RuleId: "BR04",
                            Severity: AlertSeverity.Warning,
                            TitleVi: "Cân nặng thai kỳ thay đổi bất thường ⚖️",
                            MessageVi: $"Tốc độ tăng cân ({weeklyGain:F2} kg/tuần) nằm ngoài khoảng khuyến nghị 0.2 - 0.9 kg/tuần.",
                            SuggestionVi: suggestion,
                            TriggeredAt: DateTime.UtcNow
                        );
                        alerts.Add(alert);
                        await LogAlertAndPushAsync(profile.UserId, alert);
                    }
                }
            }

            // ── BR05 — EPDS Postpartum Depression Detection ───────────────────
            if (profile.Stage == JourneyStage.Postpartum && _context != null)
            {
                var latestEpds = await _context.EpdsAssessments
                    .Where(e => e.ProfileId == profile.Id)
                    .OrderByDescending(e => e.TakenAt)
                    .FirstOrDefaultAsync();

                if (latestEpds != null && latestEpds.Answers.Sum() >= 13)
                {
                    string empatheticMessage = "Mami ơi, mami không đơn độc đâu nhé. Hãy chia sẻ cùng những người xung quanh mami nha 💙.";
                    if (_geminiService != null)
                    {
                        var profileDesc = $"Mom ID: {profile.UserId}, DeliveryDate: {profile.DeliveryDate:yyyy-MM-dd}";
                        empatheticMessage = await _geminiService.GenerateEpdsResponseAsync(latestEpds.Answers.Sum(), profileDesc);
                    }

                    var alert = new HealthAlert(
                        RuleId: "BR05",
                        Severity: AlertSeverity.Critical,
                        TitleVi: "Bạn có thể đang cần hỗ trợ tâm lý 💙",
                        MessageVi: empatheticMessage,
                        SuggestionVi: "Đường dây nóng hỗ trợ tâm lý sản phụ: 1900xxxx. Chúng tôi khuyên mami nên gặp bác sĩ sản khoa hoặc chuyên gia tâm lý. Hệ thống đã gửi thông báo đến người liên hệ khẩn cấp của mami.",
                        TriggeredAt: DateTime.UtcNow
                    );
                    alerts.Add(alert);
                    await LogAlertAndPushAsync(profile.UserId, alert);

                    // Mock sending emergency email
                    _logger?.LogWarning("EMERGENCY: EPDS Depression alert sent to emergency contact of user {UserId}", profile.UserId);
                }
            }

            return alerts;
        }

        #endregion

        #region Baby Rules (BR06 - BR10)

        public async Task<List<HealthAlert>> EvaluateBabyAsync(BabyProfile baby, BabyFoodLog todayLog)
        {
            var alerts = new List<HealthAlert>();
            int age = baby.AgeMonths;

            // ── BR06 — Baby Weaning Start (6–8 months) ─────────────────────────
            if (age >= 6 && age < 9 && !baby.FoodHistory.Contains("solid_food"))
            {
                var alert = new HealthAlert(
                    RuleId: "BR06",
                    Severity: AlertSeverity.Info,
                    TitleVi: "Đã đến lúc bắt đầu ăn dặm rồi! 🥣",
                    MessageVi: $"Bé cưng ({baby.BabyName}) đã được {age} tháng và đã sẵn sàng bắt đầu ăn dặm.",
                    SuggestionVi: "Lịch ăn dặm tuần 1: Bắt đầu với bột gạo loãng → sau đó giới thiệu rau củ hấp nghiền nhuyễn mịn → sau đó giới thiệu thịt xay.",
                    TriggeredAt: DateTime.UtcNow
                );
                alerts.Add(alert);
                await LogAlertAndPushAsync(baby.UserId, alert);
            }

            // ── BR07 — Baby Iron Deficiency Alert (6–12 months) ────────────────
            if (age >= 6 && age <= 12 && todayLog.TotalIronMg < 11.0f)
            {
                var alert = new HealthAlert(
                    RuleId: "BR07",
                    Severity: AlertSeverity.Warning,
                    TitleVi: "Cảnh báo thiếu sắt ở bé 🥩",
                    MessageVi: $"Lượng sắt bé tiêu thụ hôm nay ({todayLog.TotalIronMg:F2} mg) thấp hơn khuyến nghị 11.0 mg/ngày.",
                    SuggestionVi: "Hãy thêm các món Việt Nam giàu sắt vào cháo ăn dặm của bé: thịt bò xay nhuyễn, gan gà nghiền hấp, đậu hũ non băm hoặc cải bó xôi băm nhuyễn.",
                    TriggeredAt: DateTime.UtcNow
                );
                alerts.Add(alert);
                await LogAlertAndPushAsync(baby.UserId, alert);
            }

            // ── BR08 — Texture Progression (9–11 months) ──────────────────────
            if (age >= 9 && age <= 11 && todayLog.MealTexture == "puree")
            {
                var alert = new HealthAlert(
                    RuleId: "BR08",
                    Severity: AlertSeverity.Info,
                    TitleVi: "Bé đã sẵn sàng cho cháo đặc hơn rồi! 🍲",
                    MessageVi: "Bé đã 9-11 tháng tuổi nhưng vẫn đang ăn đồ xay nhuyễn (puree). Bé cần tập kỹ năng nhai nuốt thô.",
                    SuggestionVi: "Hãy nâng độ thô thức ăn: chuyển từ xay mịn sang cháo hạt đặc lợn cợn, rau củ mềm thái hạt lựu để bé tập bốc kiễng nhai nhai.",
                    TriggeredAt: DateTime.UtcNow
                );
                alerts.Add(alert);
                await LogAlertAndPushAsync(baby.UserId, alert);
            }

            // ── BR09 — Baby Food Allergy Detection ────────────────────────────
            if (todayLog.NewFoodIntroduced && todayLog.AllergySymptoms.Length > 0)
            {
                var criticalSymptoms = new[] { "nổi mẩn", "nôn", "tiêu chảy", "khó thở" };
                var hasAllergicSigns = todayLog.AllergySymptoms.Any(s => criticalSymptoms.Contains(s.ToLower()));

                if (hasAllergicSigns)
                {
                    bool isDyspnea = todayLog.AllergySymptoms.Any(s => s.ToLower().Contains("khó thở"));
                    string title = isDyspnea ? "🚨 CẢNH BÁO DỊ ỨNG NGUY KỊCH Ở TRẺ 🚨" : "Có thể bé đang bị dị ứng thực phẩm ⚠️";
                    string suggestion = isDyspnea
                        ? "CẢNH BÁO KHẨN CẤP: Bé có triệu chứng KHÓ THỞ. Vui lòng đưa bé đến phòng cấp cứu hoặc cơ sở y tế gần nhất ngay lập tức!"
                        : "Ngay lập tức ngừng cho bé ăn món ăn mới này. Theo dõi bé trong vòng 72 giờ và tư vấn bác sĩ nhi khoa.";

                    var alert = new HealthAlert(
                        RuleId: "BR09",
                        Severity: AlertSeverity.Critical,
                        TitleVi: title,
                        MessageVi: $"Bé xuất hiện triệu chứng dị ứng: {string.Join(", ", todayLog.AllergySymptoms)} sau khi thử món mới.",
                        SuggestionVi: suggestion,
                        TriggeredAt: DateTime.UtcNow
                    );
                    alerts.Add(alert);
                    await LogAlertAndPushAsync(baby.UserId, alert);

                    // Add food to allergy profile in database
                    if (!string.IsNullOrEmpty(todayLog.IntroducedFoodName) && _context != null)
                    {
                        var list = baby.Allergies.ToList();
                        if (!list.Contains(todayLog.IntroducedFoodName, StringComparer.OrdinalIgnoreCase))
                        {
                            list.Add(todayLog.IntroducedFoodName);
                            baby.Allergies = list.ToArray();
                            _context.BabyProfiles.Update(baby);
                            await _context.SaveChangesAsync();
                        }
                    }
                }
            }

            // ── BR10 — Omega-3 for Baby Brain (12–24 months) ───────────────────
            if (age >= 12 && age <= 24 && todayLog.WeeklyFishServings < 2)
            {
                var alert = new HealthAlert(
                    RuleId: "BR10",
                    Severity: AlertSeverity.Info,
                    TitleVi: "Bổ sung DHA giúp não bé phát triển tốt hơn 🐟",
                    MessageVi: "Lượng cá bé ăn tuần này dưới 2 bữa. Trẻ 12-24 tháng cần đủ Omega-3 cho võng mạc và não bộ.",
                    SuggestionVi: "Hãy nấu cháo cá hồi, súp cá chẽm hoặc cháo cá thu cho bé. Hãy nhớ chọn các loại cá nhỏ ít tích tụ thủy ngân mami nhé.",
                    TriggeredAt: DateTime.UtcNow
                );
                alerts.Add(alert);
                await LogAlertAndPushAsync(baby.UserId, alert);
            }

            return alerts;
        }

        #endregion

        #region Helpers

        private async Task LogAlertAndPushAsync(string userId, HealthAlert alert)
        {
            // Log critical/warning alerts to DB
            if ((alert.Severity == AlertSeverity.Critical || alert.Severity == AlertSeverity.Warning) && _context != null)
            {
                var log = new CriticalAlertLog
                {
                    UserId = userId,
                    RuleId = alert.RuleId,
                    Severity = alert.Severity,
                    TitleVi = alert.TitleVi,
                    MessageVi = alert.MessageVi,
                    SuggestionVi = alert.SuggestionVi,
                    TriggeredAt = alert.TriggeredAt,
                    IsResolved = false
                };

                _context.CriticalAlertLogs.Add(log);
                await _context.SaveChangesAsync();
            }

            // Push in real-time via SignalR
            if (_hubContext != null)
            {
                try
                {
                    await _hubContext.Clients.Group(userId).SendAsync("ReceiveAlert", alert);
                }
                catch
                {
                    // Fail silently in unit testing environments
                }
            }
        }

        #endregion
    }
}
