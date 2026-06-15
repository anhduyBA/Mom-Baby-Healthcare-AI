using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MomOi.API.Data;
using MomOi.API.DTOs;
using MomOi.API.Middleware;
using MomOi.API.Models.Health;
using MomOi.API.Models.Identity;
using MomOi.API.Models.Nutrition;
using MomOi.API.Services.BusinessRules;
using MomOi.API.Services.Nutrition;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MomOi.API.Controllers
{
    /// <summary>
    /// Controller for managing pregnancy journeys, nutrition checks, weight logs, and exercise tracking.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/pregnancy")]
    public class PregnancyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IBusinessRuleEngine _ruleEngine;
        private readonly NutritionProxyService _nutritionProxy;

        public PregnancyController(
            AppDbContext context, 
            IBusinessRuleEngine ruleEngine, 
            NutritionProxyService nutritionProxy)
        {
            _context = context;
            _ruleEngine = ruleEngine;
            _nutritionProxy = nutritionProxy;
        }

        public class SetupPregnancyRequest
        {
            public DateTime LastMenstrualPeriod { get; set; }
            public DateTime? DueDate { get; set; }
        }

        /// <summary>
        /// Initializes pregnancy tracker, calculating current week, trimester, and milestones.
        /// </summary>
        [HttpPost("setup")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SetupPregnancy([FromBody] SetupPregnancyRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                profile = new MomHealthProfile
                {
                    UserId = userId,
                    Stage = JourneyStage.Pregnant,
                    LastPeriodDate = request.LastMenstrualPeriod,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.MomHealthProfiles.Add(profile);
            }
            else
            {
                profile.Stage = JourneyStage.Pregnant;
                profile.LastPeriodDate = request.LastMenstrualPeriod;
                profile.UpdatedAt = DateTime.UtcNow;
                _context.MomHealthProfiles.Update(profile);
            }

            var daysElapsed = (DateTime.UtcNow - request.LastMenstrualPeriod).Days;
            var week = (daysElapsed / 7) + 1;
            if (week < 1) week = 1;
            if (week > 42) week = 42;

            profile.PregnancyWeek = week;
            await _context.SaveChangesAsync();

            var dueDate = request.DueDate ?? request.LastMenstrualPeriod.AddDays(280);
            var trimester = week <= 12 ? 1 : (week <= 27 ? 2 : 3);
            var milestone = $"Tuần {week}: Bé đang hình thành và phát triển tích cực.";

            var result = new
            {
                PregnancyWeek = week,
                Trimester = trimester,
                DueDate = dueDate,
                Milestone = milestone
            };

            return Ok(ApiResponse<object>.SuccessResult(result, "Thiết lập trạng thái thai sản thành công."));
        }

        /// <summary>
        /// Retrieves baby size indicators, developmental progress, and tips for the current week.
        /// </summary>
        [HttpGet("this-week")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetThisWeek()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null || profile.Stage != JourneyStage.Pregnant || !profile.PregnancyWeek.HasValue)
            {
                return BadRequest(ApiResponse<object>.FailureResult("Hồ sơ hiện tại không ở chế độ mang thai. Vui lòng thiết lập trước."));
            }

            int week = profile.PregnancyWeek.Value;
            var milestoneData = GetMilestoneForWeek(week);

            return Ok(ApiResponse<object>.SuccessResult(milestoneData));
        }

        public class FoodLogRequest
        {
            public string[] Foods { get; set; } = Array.Empty<string>();
        }

        /// <summary>
        /// Logs foods consumed and evaluates pregnancy safety checks. Gated under the Modern Mom subscription tier.
        /// </summary>
        [HttpPost("food-log")]
        [RequiresTier(SubscriptionTier.MomHienDai)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> LogFood([FromBody] FoodLogRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return BadRequest(ApiResponse<object>.FailureResult("Hồ sơ sức khỏe không tồn tại."));
            }

            // Save to DB MealLog
            var mealLog = new MealLog
            {
                UserId = userId,
                LoggedAt = DateTime.UtcNow,
                MealType = "Snack",
                FoodItems = request.Foods,
                Calories = 250f // baseline estimate
            };
            _context.MealLogs.Add(mealLog);
            await _context.SaveChangesAsync();

            // Run Rule Engine
            var alerts = await _ruleEngine.EvaluateAsync(profile);
            var br02Alerts = alerts.Where(a => a.RuleId == "BR02").ToList();

            var safeAlternatives = new List<string>();
            if (br02Alerts.Any())
            {
                safeAlternatives.Add("Phở bò chín kỹ");
                safeAlternatives.Add("Kimbap chín (không dùng trứng sống/cá sống)");
                safeAlternatives.Add("Sữa chua tiệt trùng kèm trái cây chín (chuối, xoài chín)");
            }

            var result = new
            {
                Alerts = br02Alerts,
                SafeAlternatives = safeAlternatives
            };

            return Ok(ApiResponse<object>.SuccessResult(result, "Ghi chép bữa ăn thành công."));
        }

        /// <summary>
        /// Generates a customized 7-day maternal meal plan. Gated under the Modern Mom subscription tier.
        /// </summary>
        [HttpGet("meal-plan")]
        [RequiresTier(SubscriptionTier.MomHienDai)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMealPlan([FromQuery] int? week)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            int selectedWeek = week ?? 12;
            var apiResult = await _nutritionProxy.GetMealPlanAsync(selectedWeek);

            if (apiResult != null)
            {
                return Ok(ApiResponse<object>.SuccessResult(apiResult));
            }

            // Fallback to locally generated high-quality plan
            var fallbackPlan = new List<object>();
            string[] days = { "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật" };
            foreach (var day in days)
            {
                fallbackPlan.Add(new
                {
                    Day = day,
                    Breakfast = "Cháo cá hồi nấu hạt sen và 1 ly sữa tiệt trùng",
                    Lunch = "Cơm gạo lứt, cá kho tộ, canh rau ngót luộc thịt nạc",
                    Snack = "Sữa chua hoa quả chín",
                    Dinner = "Cơm tẻ, thịt bò xào súp lơ xanh, canh bí đỏ thịt bằm",
                    DailyNutrients = new
                    {
                        Calories = 2200,
                        Protein = "85g",
                        Carbs = "290g",
                        Fat = "65g",
                        Iron = "15mg"
                    }
                });
            }

            return Ok(ApiResponse<object>.SuccessResult(fallbackPlan, "Trả về thực đơn thai sản chuẩn Việt Nam (Fallback)."));
        }

        public class WeightLogRequest
        {
            public float WeightKg { get; set; }
            public DateTime Date { get; set; }
        }

        /// <summary>
        /// Records maternal weight progress and checks for abnormal gain rates.
        /// </summary>
        [HttpPost("weight-log")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> LogWeight([FromBody] WeightLogRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return BadRequest(ApiResponse<object>.FailureResult("Hồ sơ sức khỏe không tồn tại."));
            }

            var pregnancyLog = new PregnancyLog
            {
                UserId = userId,
                Week = profile.PregnancyWeek ?? 12,
                Weight = request.WeightKg,
                RecordedAt = request.Date
            };
            _context.PregnancyLogs.Add(pregnancyLog);

            // Update current baseline weight in profile
            profile.Bmi = (request.WeightKg) / 2.5f; // rough estimate or preserve existing
            profile.UpdatedAt = DateTime.UtcNow;
            _context.MomHealthProfiles.Update(profile);

            await _context.SaveChangesAsync();

            // Run Rule Engine
            var alerts = await _ruleEngine.EvaluateAsync(profile);
            var br04Alert = alerts.FirstOrDefault(a => a.RuleId == "BR04");

            // Calculate gain progress
            var firstWeightLog = await _context.PregnancyLogs
                .Where(p => p.UserId == userId && p.Weight.HasValue)
                .OrderBy(p => p.RecordedAt)
                .FirstOrDefaultAsync();

            float totalGain = 0f;
            if (firstWeightLog != null)
            {
                totalGain = request.WeightKg - firstWeightLog.Weight!.Value;
            }

            var result = new
            {
                WeeklyGain = br04Alert != null ? -1f : 0.4f, // placeholder standard
                TotalGain = totalGain,
                Recommendation = br04Alert != null ? br04Alert.SuggestionVi : "Tốc độ tăng cân tốt mami nhé! Hãy duy trì vận động nhẹ nhàng."
            };

            return Ok(ApiResponse<object>.SuccessResult(result, "Ghi chép cân nặng thành công."));
        }

        /// <summary>
        /// Retrieves recommended exercise plan matching the user's trimester. Gated under the Modern Mom subscription tier.
        /// </summary>
        [HttpGet("exercise-plan")]
        [RequiresTier(SubscriptionTier.MomHienDai)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetExercisePlan()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null || profile.Stage != JourneyStage.Pregnant || !profile.PregnancyWeek.HasValue)
            {
                return BadRequest(ApiResponse<object>.FailureResult("Hồ sơ không ở chế độ thai kỳ để tính toán bài tập phù hợp."));
            }

            int week = profile.PregnancyWeek.Value;
            object plan;

            if (week <= 12)
            {
                plan = new
                {
                    Trimester = 1,
                    Exercises = new[]
                    {
                        new { Name = "Yoga xoay hông nhẹ nhàng", Reps = "8 nhịp", Duration = "5 phút" },
                        new { Name = "Căng giãn cơ cổ và vai gáy", Reps = "5 nhịp", Duration = "3 phút" },
                        new { Name = "Đi bộ chậm tại chỗ", Reps = "Tự do", Duration = "10 phút" }
                    }
                };
            }
            else if (week <= 27)
            {
                plan = new
                {
                    Trimester = 2,
                    Exercises = new[]
                    {
                        new { Name = "Squat nhẹ tựa tường", Reps = "10 lần", Duration = "5 phút" },
                        new { Name = "Bơi ếch nhịp nhàng", Reps = "Tự do", Duration = "20 phút" },
                        new { Name = "Pilates tăng cường xương chậu", Reps = "8 lần", Duration = "10 phút" }
                    }
                };
            }
            else
            {
                plan = new
                {
                    Trimester = 3,
                    Exercises = new[]
                    {
                        new { Name = "Hít sâu thở chậm chéo cánh tay", Reps = "12 lần", Duration = "5 phút" },
                        new { Name = "Đi bộ nhẹ ngoài trời", Reps = "Tự do", Duration = "15 phút" },
                        new { Name = "Tư thế con mèo con bò thư giãn lưng", Reps = "5 lần", Duration = "5 phút" }
                    }
                };
            }

            return Ok(ApiResponse<object>.SuccessResult(plan));
        }

        public class ExerciseLogRequest
        {
            public int StepCount { get; set; }
            public string ExerciseType { get; set; } = string.Empty;
            public int DurationMinutes { get; set; }
        }

        /// <summary>
        /// Logs step count and exercise activities, checking for physical activity deficiency (BR03).
        /// </summary>
        [HttpPost("exercise-log")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> LogExercise([FromBody] ExerciseLogRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return BadRequest(ApiResponse<object>.FailureResult("Hồ sơ sức khỏe không tồn tại."));
            }

            var log = new ExerciseLog
            {
                UserId = userId,
                StepCount = request.StepCount,
                ExerciseType = request.ExerciseType,
                DurationMinutes = request.DurationMinutes,
                RecordedAt = DateTime.UtcNow
            };
            _context.ExerciseLogs.Add(log);
            await _context.SaveChangesAsync();

            // Run Rule Engine
            var alerts = await _ruleEngine.EvaluateAsync(profile);
            var br03Alerts = alerts.Where(a => a.RuleId == "BR03").ToList();

            return Ok(ApiResponse<object>.SuccessResult(new { Alerts = br03Alerts }, "Ghi nhận vận động thành công."));
        }

        #region Helper Data

        private object GetMilestoneForWeek(int week)
        {
            string sizeStr = "bằng quả chanh ta";
            string devStr = "Hệ thống thần kinh và các cơ quan nội tạng chính bắt đầu hình thành sơ khai.";
            string tipStr = "Uống nhiều nước, bổ sung Axit Folic đầy đủ và chia nhỏ bữa ăn để hạn chế ốm nghén.";

            if (week >= 9 && week <= 12)
            {
                sizeStr = "bằng quả chanh lớn 🍋";
                devStr = "Bé đã có thể cử động ngón tay nhỏ xíu và mí mắt đã nhắm lại.";
                tipStr = "Thực hiện siêu âm đo độ mờ da gáy trong khoảng tuần 11-13.";
            }
            else if (week >= 13 && week <= 20)
            {
                sizeStr = "bằng quả xoài chín 🥭";
                devStr = "Bé bắt đầu nghe được âm thanh nhịp tim và giọng nói của mami.";
                tipStr = "Bắt đầu bôi kem chống rạn da và bổ sung Sắt, Canxi theo chỉ định.";
            }
            else if (week >= 21 && week <= 28)
            {
                sizeStr = "bằng quả cà tím lớn 🍆";
                devStr = "Bé đã mở mắt, các phế nang phổi đang phát triển để chuẩn bị thở.";
                tipStr = "Làm xét nghiệm dung nạp đường huyết thai kỳ (tuần 24-28).";
            }
            else if (week >= 29 && week <= 36)
            {
                sizeStr = "bằng quả dưa hấu lớn 🍉";
                devStr = "Bé đã quay đầu xuống dưới chuẩn bị cho tư thế sinh thuận.";
                tipStr = "Theo dõi cử động thai (đếm cơn thai máy) ít nhất 3 lần mỗi ngày.";
            }
            else if (week > 36)
            {
                sizeStr = "bằng quả bí đỏ chín muồi 🎃";
                devStr = "Các cơ quan hoàn thiện toàn diện, bé sẵn sàng chào đời bất cứ lúc nào.";
                tipStr = "Chuẩn bị giỏ đồ đi sinh, giấy tờ tùy thân và giữ tinh thần thoải mái.";
            }

            return new
            {
                Week = week,
                BabySize = sizeStr,
                Development = devStr,
                MomTips = tipStr
            };
        }

        #endregion
    }
}
