using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MomOi.API.Data;
using MomOi.API.Hubs;
using MomOi.API.Middleware;
using MomOi.API.Models.Identity;
using MomOi.API.Services.AI;
using MomOi.API.Services.Auth;
using MomOi.API.Services.BusinessRules;
using MomOi.API.Services.Nutrition;
using System;
using System.IO;
using System.Reflection;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// 1. DATABASE CONFIGURATION (Entity Framework Core)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=db,1433;Database=MomOiDb;User Id=sa;Password=YourStrongPassword123!;TrustServerCertificate=True;MultipleActiveResultSets=True;";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions => 
        sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));

// 2. IDENTITY SYSTEM CONFIGURATION
builder.Services.AddIdentity<AppUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// 3. JWT AUTHENTICATION SETUP (RS256 Asymmetric Cryptography)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "MomOiAPI",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "MomOiFrontend",
        IssuerSigningKey = RsaKeyHelper.GetValidationKey(builder.Configuration),
        ClockSkew = TimeSpan.Zero
    };
});

// 4. DEPENDENCY INJECTION FOR CUSTOM SERVICES
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBusinessRuleEngine, BusinessRuleEngine>();

// HttpClient Factory injection for FastAPI client and Gemini API client
builder.Services.AddHttpClient<NutritionProxyService>();
builder.Services.AddHttpClient<IGeminiService, GeminiService>();

// 5. GLOBAL RATE LIMITER (100 req/min per IP address)
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";
        var rateLimitResponse = MomOi.API.DTOs.ApiResponse<object>.FailureResult("Tần suất yêu cầu quá nhanh. Vui lòng đợi 1 phút.");
        await context.HttpContext.Response.WriteAsJsonAsync(rateLimitResponse, token);
    };
});

// 6. CORS (Cross-Origin Resource Sharing)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173", "https://momoi.example.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 7. HEALTH CHECK ENDPOINT SERVICE
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

// 8. CONTROLLERS & SWAGGER CONFIGURATION (With Bearer Authentication support)
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "MomOi API", 
        Version = "v1",
        Description = "Hệ thống Backend API cho ứng dụng chăm sóc mẹ và bé MomOi."
    });

    // Configure Swagger to use JWT authorization
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập JWT Token: 'Bearer {your_token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Include XML comments for API doc clarity
    try
    {
        var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        c.IncludeXmlComments(xmlPath);
    }
    catch
    {
        // XML documentation missing, suppress warning
    }
});

var app = builder.Build();

// 9. HTTP REQUEST PIPELINE ORCHESTRATION

// Global exception handler (standardizing error responses)
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment() || builder.Configuration["EnableSwagger"] == "true")
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MomOi API v1");
        c.RoutePrefix = "swagger";
    });
}

// Enable CORS
app.UseCors("CorsPolicy");

// Enable Rate Limiting
app.UseRateLimiter();

// Routing, authentication, and authorization pipeline
app.UseRouting();

app.UseAuthentication();

// Subscription authorization check middleware (gates features by Tier attribute)
app.UseMiddleware<SubscriptionTierMiddleware>();

app.UseAuthorization();

// Map Health check
app.MapHealthChecks("/health");

// Map SignalR Hubs
app.MapHub<AlertHub>("/hubs/alerts");

// Map API Controllers
app.MapControllers();

// Automatically execute DB migration on startup (facilitates Docker staging environment)
if (builder.Configuration["RunMigrationsOnStartup"] == "true")
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        dbContext.Database.Migrate();
        Console.WriteLine("Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error applying migrations on startup: {ex.Message}");
    }
}

app.Run();
