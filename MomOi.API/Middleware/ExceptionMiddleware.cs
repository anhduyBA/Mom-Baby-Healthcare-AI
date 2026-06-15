using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MomOi.API.DTOs;
using System;
using System.Text.Json;
using System.Threading.Tasks;

namespace MomOi.API.Middleware
{
    /// <summary>
    /// Middleware to globally handle uncaught exceptions and format them into standard ApiResponse JSON format.
    /// </summary>
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            
            // Map common exception types to HTTP status codes
            var statusCode = StatusCodes.Status500InternalServerError;
            var message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";

            switch (exception)
            {
                case ArgumentException or InvalidOperationException:
                    statusCode = StatusCodes.Status400BadRequest;
                    message = exception.Message;
                    break;
                case UnauthorizedAccessException:
                    statusCode = StatusCodes.Status401Unauthorized;
                    message = exception.Message;
                    break;
                default:
                    // Keep general error message for unhandled errors to avoid leaking system specifics
                    #if DEBUG
                    message = $"[Debug] {exception.Message}";
                    #endif
                    break;
            }

            context.Response.StatusCode = statusCode;
            var errorResponse = ApiResponse<object>.FailureResult(message);

            return context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            }));
        }
    }
}
