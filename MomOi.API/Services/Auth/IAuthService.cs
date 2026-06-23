using MomOi.API.DTOs.Auth;
using MomOi.API.Models.Identity;
using System.Threading.Tasks;

namespace MomOi.API.Services.Auth
{
    /// <summary>
    /// Service contract for handling user registration, authentication, token refresh, and session termination.
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Registers a new AppUser and initializes an empty MomHealthProfile.
        /// </summary>
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);

        /// <summary>
        /// Validates user credentials and returns active access and refresh tokens.
        /// </summary>
        Task<AuthResponseDto> LoginAsync(LoginDto dto);

        /// <summary>
        /// Re-issues access and refresh tokens using a valid refresh token.
        /// </summary>
        Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto);

        /// <summary>
        /// Revokes the user's active refresh token, logging them out.
        /// </summary>
        Task LogoutAsync(string userId);

        /// <summary>
        /// Generates access and refresh tokens and returns a consolidated AuthResponseDto.
        /// </summary>
        Task<AuthResponseDto> CreateAuthResponseForUserAsync(AppUser user);
    }
}
