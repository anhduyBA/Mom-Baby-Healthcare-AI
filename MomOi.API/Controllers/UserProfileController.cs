using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MomOi.API.Data;
using MomOi.API.DTOs;
using MomOi.API.DTOs.Auth;
using MomOi.API.Models.Health;
using MomOi.API.Models.Identity;
using MomOi.API.Services.Auth;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MomOi.API.Controllers
{
    /// <summary>
    /// Controller for retrieving and updating the user's isolated health profile and subscription details.
    /// </summary>
    [Authorize]
    [ApiController]
    [Route("api/user-profile")]
    public class UserProfileController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly IAuthService _authService;

        public UserProfileController(AppDbContext context, UserManager<AppUser> userManager, IAuthService authService)
        {
            _context = context;
            _userManager = userManager;
            _authService = authService;
        }

        /// <summary>
        /// Retrieves the isolated health profile of the current logged-in user.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<MomHealthProfile>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                // Auto-create profile if missing
                profile = new MomHealthProfile
                {
                    UserId = userId,
                    Stage = JourneyStage.PrePregnancy,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.MomHealthProfiles.Add(profile);
                await _context.SaveChangesAsync();
            }

            return Ok(ApiResponse<MomHealthProfile>.SuccessResult(profile));
        }

        /// <summary>
        /// Updates health metrics (e.g. BMI, journey stage, medical conditions) for the current user.
        /// </summary>
        [HttpPut]
        [ProducesResponseType(typeof(ApiResponse<MomHealthProfile>), StatusCodes.Status200OK)]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateMomProfileDto updateDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _context.MomHealthProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (profile == null)
            {
                return NotFound(ApiResponse<object>.FailureResult("Không tìm thấy hồ sơ sức khỏe."));
            }

            // Update allowed fields (PII is untouched, maintaining compliance)
            profile.Stage = updateDto.Stage;
            profile.PregnancyWeek = updateDto.PregnancyWeek;
            profile.Bmi = updateDto.Bmi;
            profile.BloodSugarLevel = updateDto.BloodSugarLevel;
            profile.HasGestDiabetes = updateDto.HasGestDiabetes;
            profile.MedicalConditions = updateDto.MedicalConditions;
            profile.AvgCycleLength = updateDto.AvgCycleLength;
            profile.LastPeriodDate = updateDto.LastPeriodDate;
            profile.DeliveryDate = updateDto.DeliveryDate;
            profile.IsBreastfeeding = updateDto.IsBreastfeeding;
            profile.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<MomHealthProfile>.SuccessResult(profile, "Cập nhật hồ sơ sức khỏe thành công."));
        }

        /// <summary>
        /// Simulated endpoint to upgrade a user's subscription tier.
        /// </summary>
        [HttpPost("upgrade")]
        [ProducesResponseType(typeof(ApiResponse<AuthResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> UpgradeSubscription([FromQuery] SubscriptionTier tier)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(ApiResponse<object>.FailureResult("Người dùng không tồn tại."));

            user.Tier = tier;
            user.TierExpiresAt = DateTime.UtcNow.AddMonths(1); // 1 month subscription
            await _userManager.UpdateAsync(user);

            var authResponse = await _authService.CreateAuthResponseForUserAsync(user);

            return Ok(ApiResponse<AuthResponseDto>.SuccessResult(authResponse, $"Nâng cấp thành công lên gói {tier}."));
        }
    }
}
