using System.ComponentModel.DataAnnotations;

namespace MomOi.API.DTOs.Auth
{
    /// <summary>
    /// DTO containing the refresh token string.
    /// </summary>
    public class RefreshTokenDto
    {
        /// <summary>
        /// Refresh token string.
        /// </summary>
        [Required(ErrorMessage = "Refresh Token không được để trống.")]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
