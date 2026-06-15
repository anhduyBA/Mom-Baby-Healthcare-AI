using Microsoft.AspNetCore.Http;
using MomOi.API.DTOs;
using MomOi.API.Models.Identity;
using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace MomOi.API.Middleware
{
    /// <summary>
    /// Attribute used to gate controller actions based on required subscription tiers.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
    public class RequiresTierAttribute : Attribute
    {
        public SubscriptionTier MinimumTier { get; }

        public RequiresTierAttribute(SubscriptionTier minimumTier)
        {
            MinimumTier = minimumTier;
        }
    }

    /// <summary>
    /// Middleware to verify if the authenticated user has the necessary subscription tier to access the requested endpoint.
    /// </summary>
    public class SubscriptionTierMiddleware
    {
        private readonly RequestDelegate _next;

        public SubscriptionTierMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var endpoint = context.GetEndpoint();
            var requiresTierAttribute = endpoint?.Metadata.GetMetadata<RequiresTierAttribute>();

            if (requiresTierAttribute != null)
            {
                // Verify user claims
                var user = context.User;
                if (user == null || !user.Identity?.IsAuthenticated == true)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    var authError = ApiResponse<object>.FailureResult("Vui lòng đăng nhập để sử dụng tính năng này.");
                    await context.Response.WriteAsync(JsonSerializer.Serialize(authError));
                    return;
                }

                // Retrieve user tier from JWT claims (we stored it as "tier")
                var tierClaim = user.FindFirst("tier")?.Value;
                if (string.IsNullOrEmpty(tierClaim) || !Enum.TryParse<SubscriptionTier>(tierClaim, out var userTier))
                {
                    // Fallback to free tier if claim is missing
                    userTier = SubscriptionTier.Free;
                }

                // Check if user has required tier
                if (userTier < requiresTierAttribute.MinimumTier)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    var forbiddenError = ApiResponse<object>.FailureResult("Vui lòng nâng cấp gói để sử dụng tính năng này.");
                    await context.Response.WriteAsync(JsonSerializer.Serialize(forbiddenError));
                    return;
                }
            }

            await _next(context);
        }
    }
}
