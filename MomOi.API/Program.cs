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

// Helper to convert postgresql:// URI format to Npgsql connection string format
string ConvertPostgresUriToConnectionString(string uriString)
{
    if (string.IsNullOrEmpty(uriString) || (!uriString.StartsWith("postgres://") && !uriString.StartsWith("postgresql://")))
    {
        return uriString;
    }
    try
    {
        var withoutProtocol = uriString.StartsWith("postgresql://") ? uriString.Substring(13) : uriString.Substring(11);
        var atIndex = withoutProtocol.IndexOf('@');
        if (atIndex == -1) return uriString;
        var userInfo = withoutProtocol.Substring(0, atIndex).Split(':');
        var username = userInfo[0];
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        var hostAndRest = withoutProtocol.Substring(atIndex + 1);
        var slashIndex = hostAndRest.IndexOf('/');
        if (slashIndex == -1) return uriString;
        var hostPort = hostAndRest.Substring(0, slashIndex).Split(':');
        var host = hostPort[0];
        var port = hostPort.Length > 1 ? hostPort[1] : "5432";
        var databaseAndQuery = hostAndRest.Substring(slashIndex + 1);
        var questionIndex = databaseAndQuery.IndexOf('?');
        var database = questionIndex == -1 ? databaseAndQuery : databaseAndQuery.Substring(0, questionIndex);
        return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
    }
    catch
    {
        return uriString;
    }
}

connectionString = ConvertPostgresUriToConnectionString(connectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (connectionString.Contains("Host=") || connectionString.Contains("Port=") || connectionString.Contains("SslMode="))
    {
        // Use PostgreSQL for production (Render/Koyeb)
        options.UseNpgsql(connectionString, npgsqlOptions => 
            npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null));
    }
    else
    {
        // Use SQL Server for local development
        options.UseSqlServer(connectionString, sqlOptions => 
            sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null));
    }
});

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
        policy.SetIsOriginAllowed(origin => true)
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

// Automatically execute DB migration / schema creation on startup
if (builder.Configuration["RunMigrationsOnStartup"] == "true")
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        if (dbContext.Database.IsNpgsql() || dbContext.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
        {
            // PostgreSQL schema creation (bypasses SQL Server specific migrations)
            dbContext.Database.EnsureCreated();
            Console.WriteLine("PostgreSQL database schema verified/created successfully.");
        }
        else
        {
            dbContext.Database.Migrate();
            Console.WriteLine("SQL Server database migrations applied successfully.");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error initializing database on startup: {ex.Message}");
    }
}

app.Run();
