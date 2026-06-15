using MomOi.API.Models.Identity;

namespace MomOi.API.DTOs.Auth
{
    /// <summary>
    /// User details returned in the authentication payload.
    /// </summary>
    public class UserResponseDto
    {
        /// <summary>
        /// Unique user identifier.
        /// </summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Email address of the user.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Current subscription tier.
        /// </summary>
        public SubscriptionTier Tier { get; set; }
    }
}
