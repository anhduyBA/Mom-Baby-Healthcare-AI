namespace MomOi.API.DTOs.Auth
{
    /// <summary>
    /// Response payload containing JWT credentials and basic user details.
    /// </summary>
    public class AuthResponseDto
    {
        /// <summary>
        /// JWT access token (short-lived, e.g. 15 minutes).
        /// </summary>
        public string Token { get; set; } = string.Empty;

        /// <summary>
        /// Refresh token (long-lived, e.g. 30 days).
        /// </summary>
        public string RefreshToken { get; set; } = string.Empty;

        /// <summary>
        /// User data object.
        /// </summary>
        public UserResponseDto User { get; set; } = null!;
    }
}
