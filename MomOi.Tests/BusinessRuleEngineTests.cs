using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MomOi.API.Data;
using MomOi.API.Hubs;
using MomOi.API.Models.Health;
using MomOi.API.Models.Identity;
using MomOi.API.Models.Nutrition;
using MomOi.API.Services.AI;
using MomOi.API.Services.BusinessRules;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace MomOi.Tests
{
    /// <summary>
    /// Unit test suite for validating business rules engine logic.
    /// </summary>
    public class BusinessRuleEngineTests
    {
        private readonly BusinessRuleEngine _engine;

        public BusinessRuleEngineTests()
        {
            _engine = new BusinessRuleEngine();
        }

        #region Legacy Rule Tests

        [Theory]
        [InlineData(22.0f, JourneyStage.PrePregnancy, false, 2000f)] // Normal BMI, baseline
        [InlineData(17.0f, JourneyStage.PrePregnancy, false, 2300f)] // Low BMI, surplus
        [InlineData(27.0f, JourneyStage.PrePregnancy, false, 1850f)] // Overweight, minor deficit
        [InlineData(32.0f, JourneyStage.PrePregnancy, false, 1700f)] // Obese, major deficit
        [InlineData(22.0f, JourneyStage.Pregnant, false, 2350f)]     // Normal BMI, pregnant surplus
        [InlineData(22.0f, JourneyStage.Postpartum, true, 2500f)]    // Normal BMI, postpartum lactating surplus
        [InlineData(22.0f, JourneyStage.Postpartum, false, 2000f)]   // Normal BMI, postpartum non-lactating baseline
        public void CalculateCalorieTarget_ShouldReturnExpectedValue(
            float bmi, JourneyStage stage, bool isBreastfeeding, float expected)
        {
            var result = _engine.CalculateCalorieTarget(bmi, stage, isBreastfeeding);
            Assert.Equal(expected, result);
        }

        [Fact]
        public void EvaluateEpdsScore_WithHighRisk_ShouldFlagIsUrgentAndHighRisk()
        {
            int[] answers = new[] { 2, 2, 2, 2, 2, 1, 1, 1, 1, 0 };
            var result = _engine.EvaluateEpdsScore(answers);
            Assert.True(result.IsUrgent);
            Assert.Equal("High", result.RiskLevel);
            Assert.Contains("nguy cơ trầm cảm sau sinh rất cao", result.Recommendation);
        }

        [Fact]
        public void EvaluateEpdsScore_WithLowRisk_ShouldReturnLowRisk()
        {
            int[] answers = new[] { 0, 0, 0, 0, 0, 0, 1, 1, 1, 1 };
            var result = _engine.EvaluateEpdsScore(answers);
            Assert.False(result.IsUrgent);
            Assert.Equal("Low", result.RiskLevel);
            Assert.Contains("Tâm lý của bạn đang ổn định", result.Recommendation);
        }

        [Theory]
        [InlineData(0, "male", 3.4f, 50.8f, true, "Normal", "Normal")]
        [InlineData(0, "female", 3.0f, 49.2f, true, "Normal", "Normal")]
        [InlineData(6, "male", 5.0f, 62.8f, false, "Underweight", "Normal")]
        public void VerifyBabyGrowth_ShouldReturnCorrectClassifications(
            int ageMonths, string gender, float weight, float height,
            bool expectedHealthy, string expectedWeightStatus, string expectedHeightStatus)
        {
            var result = _engine.VerifyBabyGrowth(ageMonths, gender, weight, height);
            Assert.Equal(expectedHealthy, result.IsHealthy);
            Assert.Equal(expectedWeightStatus, result.WeightStatus);
            Assert.Equal(expectedHeightStatus, result.HeightStatus);
        }

        #endregion

        #region Business Rules BR01 - BR10 Tests

        private DbContextOptions<AppDbContext> CreateInMemoryOptions()
        {
            return new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
        }

        private (Mock<IGeminiService>, Mock<IHubContext<AlertHub>>) CreateServiceMocks()
        {
            var mockGemini = new Mock<IGeminiService>();
            var mockHub = new Mock<IHubContext<AlertHub>>();
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<ISingleClientProxy>();

            mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
            mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);

            return (mockGemini, mockHub);
        }

        [Fact]
        public async Task EvaluateAsync_BR01_FertileWindow_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var profile = new MomHealthProfile
            {
                UserId = "user-1",
                Stage = JourneyStage.PrePregnancy,
                AvgCycleLength = 28,
                LastPeriodDate = DateTime.UtcNow.Date.AddDays(-13) // ovulation = Day 14 (tomorrow)
            };

            // Act
            var alerts = await engine.EvaluateAsync(profile);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR01");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Critical, alert.Severity);
            Assert.Contains("Cửa sổ thụ thai", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateAsync_BR02_PregnancyDangerousFood_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            
            mockGemini.Setup(g => g.GenerateGenZWarningAsync(It.IsAny<string>(), It.IsAny<int>()))
                .ReturnsAsync("Mami ơi, ăn sushi hổng ổn tí nào nè!");

            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var profile = new MomHealthProfile
            {
                UserId = "user-2",
                Stage = JourneyStage.Pregnant,
                PregnancyWeek = 12
            };

            // Add dangerous food log today
            context.MealLogs.Add(new MealLog
            {
                UserId = "user-2",
                LoggedAt = DateTime.UtcNow,
                FoodItems = new[] { "Sushi hồi chín tái", "Trà đá" }
            });
            await context.SaveChangesAsync();

            // Act
            var alerts = await engine.EvaluateAsync(profile);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR02");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Critical, alert.Severity);
            Assert.Contains("sushi", alert.MessageVi);
        }

        [Fact]
        public async Task EvaluateAsync_BR03_ExerciseStepsDeficiency_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var profile = new MomHealthProfile
            {
                UserId = "user-3",
                Stage = JourneyStage.Pregnant,
                PregnancyWeek = 20
            };

            // Last exercise was 4 days ago
            context.ExerciseLogs.Add(new ExerciseLog
            {
                UserId = "user-3",
                StepCount = 5000,
                DurationMinutes = 30,
                RecordedAt = DateTime.UtcNow.AddDays(-4)
            });
            // Today steps under 3000
            context.ExerciseLogs.Add(new ExerciseLog
            {
                UserId = "user-3",
                StepCount = 1200,
                DurationMinutes = 10,
                RecordedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // Act
            var alerts = await engine.EvaluateAsync(profile);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR03");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Warning, alert.Severity);
            Assert.Contains("chưa vận động", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateAsync_BR04_PregnancyWeightGainAbnormal_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var profile = new MomHealthProfile
            {
                UserId = "user-4",
                Stage = JourneyStage.Pregnant,
                PregnancyWeek = 22 // T2/T3
            };

            // Log 7 days ago (60kg)
            context.PregnancyLogs.Add(new PregnancyLog
            {
                UserId = "user-4",
                Week = 21,
                Weight = 60.0f,
                RecordedAt = DateTime.UtcNow.AddDays(-7)
            });
            // Log today (61.5kg -> gain 1.5kg in a week, limit is 0.9kg)
            context.PregnancyLogs.Add(new PregnancyLog
            {
                UserId = "user-4",
                Week = 22,
                Weight = 61.5f,
                RecordedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // Act
            var alerts = await engine.EvaluateAsync(profile);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR04");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Warning, alert.Severity);
            Assert.Contains("Cân nặng", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateAsync_BR05_EpdsPostpartumDepression_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();

            mockGemini.Setup(g => g.GenerateEpdsResponseAsync(It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync("Mami ơi, chúng mình luôn ở bên mami nè 💙.");

            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var profile = new MomHealthProfile
            {
                UserId = "user-5",
                Stage = JourneyStage.Postpartum,
                DeliveryDate = DateTime.UtcNow.AddDays(-10)
            };
            context.MomHealthProfiles.Add(profile);
            await context.SaveChangesAsync();

            // High risk EPDS screening (Sum = 16)
            context.EpdsAssessments.Add(new EpdsAssessment
            {
                ProfileId = profile.Id,
                Answers = new[] { 2, 2, 2, 2, 2, 2, 2, 2, 0, 0 },
                TakenAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();

            // Act
            var alerts = await engine.EvaluateAsync(profile);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR05");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Critical, alert.Severity);
            Assert.Contains("hỗ trợ tâm lý", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateBabyAsync_BR06_WeaningTimeline_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var baby = new BabyProfile
            {
                UserId = "user-6",
                BabyName = "Minh",
                DateOfBirth = DateTime.UtcNow.AddDays(-210), // ~7 months old
                Gender = "male",
                FoodHistory = new[] { "breast_milk", "formula" } // solid_food is missing
            };

            var todayLog = new BabyFoodLog
            {
                BabyProfileId = 1,
                MealTexture = "liquid"
            };

            // Act
            var alerts = await engine.EvaluateBabyAsync(baby, todayLog);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR06");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Info, alert.Severity);
            Assert.Contains("ăn dặm", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateBabyAsync_BR07_IronDeficiency_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var baby = new BabyProfile
            {
                UserId = "user-7",
                DateOfBirth = DateTime.UtcNow.AddDays(-240), // ~8 months old
                Gender = "female"
            };

            var todayLog = new BabyFoodLog
            {
                BabyProfileId = 2,
                TotalIronMg = 8.5f // below 11.0mg
            };

            // Act
            var alerts = await engine.EvaluateBabyAsync(baby, todayLog);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR07");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Warning, alert.Severity);
            Assert.Contains("thiếu sắt", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateBabyAsync_BR08_TextureProgression_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var baby = new BabyProfile
            {
                UserId = "user-8",
                DateOfBirth = DateTime.UtcNow.AddDays(-300), // ~10 months old
                Gender = "male"
            };

            var todayLog = new BabyFoodLog
            {
                BabyProfileId = 3,
                MealTexture = "puree" // ready for lumpy textures
            };

            // Act
            var alerts = await engine.EvaluateBabyAsync(baby, todayLog);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR08");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Info, alert.Severity);
            Assert.Contains("cháo đặc", alert.TitleVi);
        }

        [Fact]
        public async Task EvaluateBabyAsync_BR09_AllergySymptoms_TriggersAlertAndSavesToAllergies()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var baby = new BabyProfile
            {
                Id = 1,
                UserId = "user-9",
                DateOfBirth = DateTime.UtcNow.AddDays(-200),
                Gender = "male",
                Allergies = Array.Empty<string>()
            };
            context.BabyProfiles.Add(baby);
            await context.SaveChangesAsync();

            var todayLog = new BabyFoodLog
            {
                BabyProfileId = 1,
                NewFoodIntroduced = true,
                IntroducedFoodName = "Trứng",
                AllergySymptoms = new[] { "nổi mẩn", "nôn" }
            };

            // Act
            var alerts = await engine.EvaluateBabyAsync(baby, todayLog);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR09");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Critical, alert.Severity);
            Assert.Contains("dị ứng thực phẩm", alert.TitleVi);

            // Verify allergen saved onto baby profile
            var updatedBaby = await context.BabyProfiles.FindAsync(1);
            Assert.NotNull(updatedBaby);
            Assert.Contains("Trứng", updatedBaby.Allergies);
        }

        [Fact]
        public async Task EvaluateBabyAsync_BR10_Omega3Deficiency_TriggersAlert()
        {
            // Arrange
            var options = CreateInMemoryOptions();
            using var context = new AppDbContext(options);
            var (mockGemini, mockHub) = CreateServiceMocks();
            var engine = new BusinessRuleEngine(context, mockGemini.Object, mockHub.Object);

            var baby = new BabyProfile
            {
                UserId = "user-10",
                DateOfBirth = DateTime.UtcNow.AddDays(-450), // ~15 months old
                Gender = "female"
            };

            var todayLog = new BabyFoodLog
            {
                BabyProfileId = 5,
                WeeklyFishServings = 1 // below 2 servings
            };

            // Act
            var alerts = await engine.EvaluateBabyAsync(baby, todayLog);

            // Assert
            var alert = alerts.FirstOrDefault(a => a.RuleId == "BR10");
            Assert.NotNull(alert);
            Assert.Equal(AlertSeverity.Info, alert.Severity);
            Assert.Contains("DHA", alert.TitleVi);
        }

        #endregion
    }
}
