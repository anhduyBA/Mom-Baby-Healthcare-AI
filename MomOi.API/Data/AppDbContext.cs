using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using MomOi.API.Models.Health;
using MomOi.API.Models.Identity;
using MomOi.API.Models.Nutrition;
using System;
using System.Text.Json;

namespace MomOi.API.Data
{
    /// <summary>
    /// Database context for the MomOi application, inheriting from IdentityDbContext to support authentication.
    /// </summary>
    public class AppDbContext : IdentityDbContext<AppUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<MomHealthProfile> MomHealthProfiles { get; set; } = null!;
        public DbSet<BabyProfile> BabyProfiles { get; set; } = null!;
        public DbSet<EpdsAssessment> EpdsAssessments { get; set; } = null!;
        public DbSet<CycleLog> CycleLogs { get; set; } = null!;
        public DbSet<PregnancyLog> PregnancyLogs { get; set; } = null!;
        public DbSet<PostpartumLog> PostpartumLogs { get; set; } = null!;
        public DbSet<GrowthRecord> GrowthRecords { get; set; } = null!;
        public DbSet<MealLog> MealLogs { get; set; } = null!;
        public DbSet<FoodAllergyRecord> FoodAllergyRecords { get; set; } = null!;
        public DbSet<CriticalAlertLog> CriticalAlertLogs { get; set; } = null!;
        public DbSet<ExerciseLog> ExerciseLogs { get; set; } = null!;
        public DbSet<BabyFoodLog> BabyFoodLogs { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure value converters for JSON serialization of arrays in SQL Server
            var stringArrayConverter = new ValueConverter<string[], string>(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null!),
                v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions)null!) ?? Array.Empty<string>()
            );

            var nullableStringArrayConverter = new ValueConverter<string[]?, string>(
                v => v == null ? "[]" : JsonSerializer.Serialize(v, (JsonSerializerOptions)null!),
                v => string.IsNullOrEmpty(v) ? null : JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions)null!)
            );

            var intArrayConverter = new ValueConverter<int[], string>(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null!),
                v => JsonSerializer.Deserialize<int[]>(v, (JsonSerializerOptions)null!) ?? new int[10]
            );

            // Apply converters
            builder.Entity<MomHealthProfile>()
                .Property(m => m.MedicalConditions)
                .HasConversion(nullableStringArrayConverter);

            builder.Entity<BabyProfile>()
                .Property(b => b.Allergies)
                .HasConversion(stringArrayConverter);

            builder.Entity<BabyProfile>()
                .Property(b => b.FoodHistory)
                .HasConversion(stringArrayConverter);

            builder.Entity<EpdsAssessment>()
                .Property(e => e.Answers)
                .HasConversion(intArrayConverter);

            builder.Entity<MealLog>()
                .Property(m => m.FoodItems)
                .HasConversion(stringArrayConverter);

            builder.Entity<BabyFoodLog>()
                .Property(b => b.AllergySymptoms)
                .HasConversion(stringArrayConverter);

            // Establish 1-to-1 relationship between AppUser and MomHealthProfile
            builder.Entity<MomHealthProfile>()
                .HasOne(m => m.User)
                .WithOne(u => u.HealthProfile)
                .HasForeignKey<MomHealthProfile>(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Index UserId in health profile, baby profile, logs for performance
            builder.Entity<MomHealthProfile>()
                .HasIndex(m => m.UserId)
                .IsUnique();

            builder.Entity<BabyProfile>()
                .HasIndex(b => b.UserId);

            builder.Entity<PregnancyLog>()
                .HasIndex(p => p.UserId);

            builder.Entity<PostpartumLog>()
                .HasIndex(p => p.UserId);

            builder.Entity<MealLog>()
                .HasIndex(m => m.UserId);

            builder.Entity<FoodAllergyRecord>()
                .HasIndex(f => f.UserId);

            builder.Entity<CriticalAlertLog>()
                .HasIndex(c => c.UserId);

            builder.Entity<ExerciseLog>()
                .HasIndex(e => e.UserId);

            builder.Entity<BabyFoodLog>()
                .HasIndex(b => b.BabyProfileId);
        }
    }
}
