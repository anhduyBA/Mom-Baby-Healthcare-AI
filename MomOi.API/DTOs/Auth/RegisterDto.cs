using System.ComponentModel.DataAnnotations;

namespace MomOi.API.DTOs.Auth
{
    /// <summary>
    /// DTO containing fields required for new user registration.
    /// </summary>
    public class RegisterDto
    {
        /// <summary>
        /// Email address of the user.
        /// </summary>
        [Required(ErrorMessage = "Email không được để trống.")]
        [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Password of the user.
        /// </summary>
        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the user.
        /// </summary>
        [Required(ErrorMessage = "Họ và tên không được để trống.")]
        public string FullName { get; set; } = string.Empty;
    }
}
