using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MomOi.API.Data;
using MomOi.API.DTOs;
using MomOi.API.Models.Health;
using MomOi.API.Services.BusinessRules;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MomOi.API.Controllers
{
    /// <summary>
    /// Controller for managing baby profiles and tracking growth milestones.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/baby")]
    public class BabyController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IBusinessRuleEngine _businessRuleEngine;

        public BabyController(AppDbContext context, IBusinessRuleEngine businessRuleEngine)
        {
            _context = context;
            _businessRuleEngine = businessRuleEngine;
        }

        /// <summary>
        /// Creates a new profile for a baby.
        /// </summary>
        [HttpPost("profile")]
        [ProducesResponseType(typeof(ApiResponse<BabyProfile>), StatusCodes.Status200OK)]
        public async Task<IActionResult> CreateBabyProfile([FromBody] BabyProfile profile)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            profile.UserId = userId;
            _context.BabyProfiles.Add(profile);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<BabyProfile>.SuccessResult(profile, "Tạo hồ sơ cho bé thành công."));
        }

        /// <summary>
        /// Retrieves all baby profiles linked to the current user.
        /// </summary>
        [HttpGet("profiles")]
        [ProducesResponseType(typeof(ApiResponse<List<BabyProfile>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetBabyProfiles()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profiles = await _context.BabyProfiles
                .Where(p => p.UserId == userId)
                .ToListAsync();

            return Ok(ApiResponse<List<BabyProfile>>.SuccessResult(profiles));
        }

        /// <summary>
        /// Logs a growth milestone (weight/height) for a baby and provides developmental feedback.
        /// </summary>
        [HttpPost("{id}/growth")]
        [ProducesResponseType(typeof(ApiResponse<GrowthEvaluationResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> LogGrowth(int id, [FromBody] GrowthRecord record)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var baby = await _context.BabyProfiles
                .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

            if (baby == null)
            {
                return NotFound(ApiResponse<object>.FailureResult("Không tìm thấy hồ sơ của bé."));
            }

            // Save growth checkpoint
            record.BabyProfileId = baby.Id;
            record.BabyProfile = null!; // Avoid loop
            record.RecordedAt = DateTime.UtcNow;

            _context.GrowthRecords.Add(record);

            // Dynamically update baby profile values
            baby.CurrentWeightKg = record.WeightKg;
            baby.CurrentHeightCm = record.HeightCm;

            await _context.SaveChangesAsync();

            // Run business rule engine comparison against developmental ranges
            var ageInMonths = baby.AgeMonths;
            var evaluation = _businessRuleEngine.VerifyBabyGrowth(
                ageInMonths, 
                baby.Gender, 
                record.WeightKg, 
                record.HeightCm
            );

            return Ok(ApiResponse<GrowthEvaluationResult>.SuccessResult(evaluation, "Ghi nhận chỉ số tăng trưởng và đánh giá thành công."));
        }
    }
}
