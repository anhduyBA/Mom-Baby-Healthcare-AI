using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MomOi.API.Data;
using MomOi.API.DTOs;
using MomOi.API.Middleware;
using MomOi.API.Models.Health;
using MomOi.API.Models.Identity;
using MomOi.API.Services.AI;
using MomOi.API.Services.BusinessRules;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MomOi.API.Controllers
{
    /// <summary>
    /// Controller for managing postpartum recovery, lactation logs, and EPDS/voice screening.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/postpartum")]
    public class PostpartumController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IBusinessRuleEngine _businessRuleEngine;
        private readonly IGeminiService _geminiService;

        public PostpartumController(
            AppDbContext context, 
            IBusinessRuleEngine businessRuleEngine, 
            IGeminiService geminiService)
        {
            _context = context;
            _businessRuleEngine = businessRuleEngine;
            _geminiService = geminiService;
        }

        public class SetupPostpartumRequest
        {
            public DateTime DeliveryDate { get; set; }
            public string DeliveryType { get; set; } = "natural"; // "natural" | "cesarean"
            public bool IsBreastfeeding { get; set; }
        }

        /// <summary>
        /// Registers a postpartum profile setup, computing days postpartum, healing phases, and recovery recommendations.
        /// </summary>
        [HttpPost("setup")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SetupPostpartum([FromBody] SetupPostpartumRequest request)
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
                    Stage = JourneyStage.Postpartum,
                    DeliveryDate = request.DeliveryDate,
                    IsBreastfeeding = request.IsBreastfeeding,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.MomHealthProfiles.Add(profile);
            }
            else
            {
                profile.Stage = JourneyStage.Postpartum;
                profile.DeliveryDate = request.DeliveryDate;
                profile.IsBreastfeeding = request.IsBreastfeeding;
                profile.UpdatedAt = DateTime.UtcNow;
                _context.MomHealthProfiles.Update(profile);
            }

            await _context.SaveChangesAsync();

            var daysPostpartum = (DateTime.UtcNow.Date - request.DeliveryDate.Date).Days;
            if (daysPostpartum < 0) daysPostpartum = 0;

            string phase = "Giai đoạn hồi phục cấp tính (Tuần 1)";
            string initialRec = "Hãy ưu tiên nghỉ ngơi hoàn toàn tại giường, bổ sung đủ nước và tránh mang vác vật nặng.";

            if (daysPostpartum > 7 && daysPostpartum <= 42)
            {
                phase = "Giai đoạn phục hồi vết thương (Tuần 2 - 6)";
                initialRec = request.DeliveryType.Equals("cesarean", StringComparison.OrdinalIgnoreCase)
                    ? "Vết mổ của bạn đang lành. Tập đi bộ nhẹ nhàng và tránh các động tác căng cơ bụng."
                    : "Tập Kegel nhẹ nhàng để hồi phục cơ sàn chậu và tăng tuần hoàn máu vùng chậu.";
            }
            else if (daysPostpartum > 42)
            {
                phase = "Giai đoạn ổn định lâu dài (Sau 6 tuần)";
                initialRec = "Bạn đã có thể bắt đầu tập luyện cường độ vừa phải. Hãy duy trì thói quen ăn uống cân bằng dinh dưỡng.";
            }

            var result = new
            {
                DaysPostpartum = daysPostpartum,
                RecoveryPhase = phase,
                InitialRecommendations = initialRec
            };

            return Ok(ApiResponse<object>.SuccessResult(result, "Thiết lập trạng thái sau sinh thành công."));
        }

        public class EpdsRequest
        {
            public int[] Answers { get; set; } = new int[10];
        }

        /// <summary>
        /// Submits answers to the 10 EPDS questions. Triggers BR05 rule evaluation and returns Gemini generated empathetic messages. Gated under the Modern Mom tier.
        /// </summary>
        [HttpPost("epds")]
        [RequiresTier(SubscriptionTier.MomHienDai)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> SubmitEpds([FromBody] EpdsRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return BadRequest(ApiResponse<object>.FailureResult("Vui lòng tạo hồ sơ sức khỏe trước khi thực hiện khảo sát."));
            }

            try
            {
                var evaluation = _businessRuleEngine.EvaluateEpdsScore(request.Answers);

                // Gemini Empathetic Messaging
                string aiMessage = evaluation.Recommendation;
                if (evaluation.IsUrgent)
                {
                    var profileDesc = $"Mom ID: {userId}, DeliveryDate: {profile.DeliveryDate:yyyy-MM-dd}";
                    aiMessage = await _geminiService.GenerateEpdsResponseAsync(evaluation.TotalScore, profileDesc);
                }

                var epds = new EpdsAssessment
                {
                    ProfileId = profile.Id,
                    Answers = request.Answers,
                    TakenAt = DateTime.UtcNow,
                    AiAnalysis = $"Score: {evaluation.TotalScore}. Analysis: {aiMessage}"
                };

                _context.EpdsAssessments.Add(epds);
                await _context.SaveChangesAsync();

                // Trigger rule evaluation for alerts/SignalR/DB logs
                await _businessRuleEngine.EvaluateAsync(profile);

                var resources = new List<string>
                {
                    "Đường dây nóng hỗ trợ tâm lý sản phụ: 1900xxxx",
                    "Chương trình đồng hành sức khỏe tinh thần MomOi",
                    "Bác sĩ chuyên khoa tâm lý Bệnh viện Phụ sản"
                };

                var result = new
                {
                    Score = evaluation.TotalScore,
                    IsUrgent = evaluation.IsUrgent,
                    AiMessage = aiMessage,
                    Resources = resources
                };

                return Ok(ApiResponse<object>.SuccessResult(result, "Ghi nhận kết quả khảo sát EPDS thành công."));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ApiResponse<object>.FailureResult(ex.Message));
            }
        }

        public class VoiceJournalRequest
        {
            public string AudioBase64 { get; set; } = string.Empty;
            public string MimeType { get; set; } = "audio/mp3";
        }

        /// <summary>
        /// Analyzes a spoken audio journal entry using Gemini 1.5 Pro multimodal capabilities. Gated under Super Mom VIP.
        /// </summary>
        [HttpPost("epds/voice-journal")]
        [RequiresTier(SubscriptionTier.SuperMomVip)]
        [ProducesResponseType(typeof(ApiResponse<VoiceJournalResult>), StatusCodes.Status200OK)]
        public async Task<IActionResult> AnalyzeVoiceJournal([FromBody] VoiceJournalRequest request)
        {
            if (string.IsNullOrEmpty(request.AudioBase64))
            {
                return BadRequest(ApiResponse<object>.FailureResult("Dữ liệu âm thanh không được để trống."));
            }

            var analysis = await _geminiService.AnalyzeVoiceJournalAsync(request.AudioBase64, request.MimeType);

            return Ok(ApiResponse<VoiceJournalResult>.SuccessResult(analysis, "Phân tích nhật ký ghi âm thành công."));
        }

        public class BreastfeedingLogRequest
        {
            public string Side { get; set; } = "both"; // "left" | "right" | "both"
            public int DurationMinutes { get; set; }
            public DateTime Time { get; set; } = DateTime.UtcNow;
        }

        /// <summary>
        /// Records breastfeeding session logs and calculates feeding trends.
        /// </summary>
        [HttpPost("breastfeeding-log")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> LogBreastfeeding([FromBody] BreastfeedingLogRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Persist the log inside a generic PostpartumLog note
            var postpartumLog = new PostpartumLog
            {
                UserId = userId,
                DaysPostpartum = 10, // placeholder default or fetch delivery diff
                RecordedAt = DateTime.UtcNow,
                Notes = $"Bú sữa bên: {request.Side}, Thời lượng: {request.DurationMinutes} phút, Lúc: {request.Time:HH:mm}"
            };

            _context.PostpartumLogs.Add(postpartumLog);
            await _context.SaveChangesAsync();

            var result = new
            {
                DailySummary = $"Hôm nay bé đã bú mẹ tổng cộng {request.DurationMinutes} phút.",
                SupplyTrend = "Lượng sữa đang duy trì ở mức ổn định. Tiếp tục cho bé bú theo nhu cầu để duy trì nguồn sữa.",
                Tips = new[]
                {
                    "Massage bầu ngực nhẹ nhàng bằng khăn ấm trước khi cho bú.",
                    "Uống 1 cốc nước ấm trước và sau mỗi lần cho con bú.",
                    "Đảm bảo khớp ngậm của bé chính xác để không bị đau nứt cổ gà."
                }
            };

            return Ok(ApiResponse<object>.SuccessResult(result, "Lưu nhật ký cho con bú thành công."));
        }

        /// <summary>
        /// Generates pelvic floor, walking, and core workout plans based on recovery progress days.
        /// </summary>
        [HttpGet("recovery-plan")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRecoveryPlan([FromQuery] int? day)
        {
            await Task.CompletedTask;
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            int targetDay = day ?? 14;

            object exerciseSchedule;
            if (targetDay <= 7)
            {
                exerciseSchedule = new
                {
                    Week = 1,
                    ActiveExercise = "Tập bài tập sàn chậu nhẹ nhàng (Kegel nằm ngửa) và các động tác hít thở bằng bụng sâu.",
                    Allowed = new[] { "Kegel nhẹ", "Co duỗi chân" },
                    Locked = new[] { "Đi bộ đường dài", "Bài tập bụng sâu" }
                };
            }
            else if (targetDay <= 42)
            {
                exerciseSchedule = new
                {
                    Week = 2,
                    ActiveExercise = "Đi bộ nhẹ nhàng từ 15-20 phút mỗi ngày và tăng dần cường độ bài tập sàn chậu.",
                    Allowed = new[] { "Kegel nâng cao", "Đi bộ thong thả", "Tư thế mèo bò nhẹ" },
                    Locked = new[] { "Plank", "Crunch cơ bụng" }
                };
            }
            else
            {
                exerciseSchedule = new
                {
                    Week = 6,
                    ActiveExercise = "Bắt đầu tập cơ bụng cốt lõi (Core) nhẹ nhàng, đi bộ nhanh và tập các bài tập tay vai nhẹ.",
                    Allowed = new[] { "Plank ngắn", "Đi bộ nhanh", "Pilates hồi phục" },
                    Locked = new string[] { }
                };
            }

            var result = new
            {
                Day = targetDay,
                RecoveryPhase = targetDay <= 7 ? "Hồi phục ban đầu" : (targetDay <= 42 ? "Hồi phục trung gian" : "Ổn định lâu dài"),
                ExerciseSchedule = exerciseSchedule
            };

            return Ok(ApiResponse<object>.SuccessResult(result));
        }
    }
}
