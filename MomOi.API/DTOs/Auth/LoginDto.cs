using System.ComponentModel.DataAnnotations;

namespace MomOi.API.DTOs.Auth
{
    /// <summary>
    /// DTO containing fields required for user login.
    /// </summary>
    public class LoginDto
    {
        /// <summary>
        /// Registered email address.
        /// </summary>
        [Required(ErrorMessage = "Email không được để trống.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Password.
        /// </summary>
        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        public string Password { get; set; } = string.Empty;
    }
}
