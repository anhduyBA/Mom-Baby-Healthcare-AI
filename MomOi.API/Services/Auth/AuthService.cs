using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MomOi.API.Data;
using MomOi.API.DTOs.Auth;
using MomOi.API.Models.Health;
using MomOi.API.Models.Identity;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;

namespace MomOi.API.Services.Auth
{
    /// <summary>
    /// Handles authorization, user registration, JWT generation (RS256), and refresh token cycles.
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(
            UserManager<AppUser> userManager,
            AppDbContext context,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            var existingUser = await _userManager.FindByEmailAsync(dto.Email);
            if (existingUser != null)
            {
                throw new ArgumentException("Email này đã được đăng ký sử dụng.");
            }

            var user = new AppUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                FullName = dto.FullName,
                CreatedAt = DateTime.UtcNow,
                Tier = SubscriptionTier.Free
            };

            var result = await _userManager.CreateAsync(user, dto.Password);
            if (!result.Succeeded)
            {
                var errors = string.Join("; ", System.Linq.Enumerable.Select(result.Errors, e => e.Description));
                throw new InvalidOperationException($"Đăng ký thất bại: {errors}");
            }

            // PII & Health separation: Initialize empty MomHealthProfile in health table
            var healthProfile = new MomHealthProfile
            {
                UserId = user.Id,
                Stage = JourneyStage.PrePregnancy,
                UpdatedAt = DateTime.UtcNow
            };

            _context.MomHealthProfiles.Add(healthProfile);
            await _context.SaveChangesAsync();

            // Generate JWT and Refresh token
            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = new UserResponseDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    Tier = user.Tier
                }
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            {
                throw new UnauthorizedAccessException("Email hoặc mật khẩu không chính xác.");
            }

            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = new UserResponseDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    Tier = user.Tier
                }
            };
        }

        public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto)
        {
            var principal = GetPrincipalFromExpiredToken(dto.RefreshToken);
            // If the principal is null or has no claims, we can locate user directly by scanning DB for the refresh token
            // This is safer if token parsing fails when token is completely expired
            var user = await _userManager.FindByNameAsync(principal?.Identity?.Name ?? string.Empty);
            
            if (user == null)
            {
                // Fallback: look up user by the refresh token itself
                user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    _userManager.Users, u => u.RefreshToken == dto.RefreshToken);
            }

            if (user == null || user.RefreshToken != dto.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                throw new UnauthorizedAccessException("Refresh Token không hợp lệ hoặc đã hết hạn.");
            }

            var newToken = GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();

            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);

            return new AuthResponseDto
            {
                Token = newToken,
                RefreshToken = newRefreshToken,
                User = new UserResponseDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    Tier = user.Tier
                }
            };
        }

        public async Task LogoutAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                user.RefreshToken = null;
                user.RefreshTokenExpiryTime = null;
                await _userManager.UpdateAsync(user);
            }
        }

        public async Task<AuthResponseDto> CreateAuthResponseForUserAsync(AppUser user)
        {
            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);

            return new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                User = new UserResponseDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    Tier = user.Tier
                }
            };
        }

        private string GenerateJwtToken(AppUser user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim("fullname", user.FullName),
                new Claim("tier", ((int)user.Tier).ToString())
            };

            var signingKey = RsaKeyHelper.GetSigningKey(_configuration);
            var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.RsaSha256);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(15), // 15-minute access token
                Issuer = _configuration["Jwt:Issuer"] ?? "MomOiAPI",
                Audience = _configuration["Jwt:Audience"] ?? "MomOiFrontend",
                SigningCredentials = credentials
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        private ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
        {
            // We just need to read the claims to find out who the user is.
            // Since the refresh token is verified cryptographically in DB,
            // we can read claims from the JWT (even if expired).
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtToken = tokenHandler.ReadJwtToken(token);
                return new ClaimsPrincipal(new ClaimsIdentity(jwtToken.Claims, "jwt"));
            }
            catch
            {
                return null;
            }
        }
    }
}
