using Microsoft.AspNetCore.Identity;
using MomOi.API.Models.Health;
using System;

namespace MomOi.API.Models.Identity
{
    /// <summary>
    /// Subscription tiers available in the MomOi application.
    /// </summary>
    public enum SubscriptionTier
    {
        Free = 0,
        MomHienDai = 1,
        SuperMomVip = 2
    }

    /// <summary>
    /// Represents the user identity model. Stored in AspNetUsers, holding PII ONLY (Decree 13/2023/ND-CP compliance).
    /// </summary>
    public class AppUser : IdentityUser
    {
        /// <summary>
        /// Full name of the user.
        /// </summary>
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Date and time when the user profile was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// The current subscription tier of the user.
        /// </summary>
        public SubscriptionTier Tier { get; set; } = SubscriptionTier.Free;

        /// <summary>
        /// Expiry date and time of the subscription tier (null if lifetime/free).
        /// </summary>
        public DateTime? TierExpiresAt { get; set; }

        /// <summary>
        /// Active refresh token for generating new access tokens.
        /// </summary>
        public string? RefreshToken { get; set; }

        /// <summary>
        /// Expiry time of the refresh token.
        /// </summary>
        public DateTime? RefreshTokenExpiryTime { get; set; }

        /// <summary>
        /// Navigation property to the health profile stored in a separate table.
        /// </summary>
        public MomHealthProfile? HealthProfile { get; set; }
    }
}
