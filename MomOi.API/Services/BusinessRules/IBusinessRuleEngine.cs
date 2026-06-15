using MomOi.API.Models.Health;
using MomOi.API.Models.Nutrition;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MomOi.API.Services.BusinessRules
{
    /// <summary>
    /// Details the evaluation result of a baby's growth indicators.
    /// </summary>
    public class GrowthEvaluationResult
    {
        public bool IsHealthy { get; set; }
        public string WeightStatus { get; set; } = string.Empty; // "Underweight", "Normal", "Overweight"
        public string HeightStatus { get; set; } = string.Empty; // "Short", "Normal", "Tall"
        public string Feedback { get; set; } = string.Empty;
    }

    /// <summary>
    /// Details the evaluation result of an EPDS depression screening.
    /// </summary>
    public class EpdsEvaluationResult
    {
        public int TotalScore { get; set; }
        public bool IsUrgent { get; set; }
        public string RiskLevel { get; set; } = string.Empty; // "Low", "Moderate", "High"
        public string Recommendation { get; set; } = string.Empty;
    }

    /// <summary>
    /// Structured record for health alerts triggered by rules.
    /// </summary>
    public record HealthAlert(
        string RuleId,
        AlertSeverity Severity,
        string TitleVi,
        string MessageVi,
        string SuggestionVi,
        System.DateTime TriggeredAt
    );

    /// <summary>
    /// Engine to process mathematical, clinical, and physiological rules for maternal/infant care.
    /// </summary>
    public interface IBusinessRuleEngine
    {
        /// <summary>
        /// Calculates the recommended daily calorie targets based on BMI, stage, and breastfeeding status.
        /// </summary>
        float CalculateCalorieTarget(float bmi, JourneyStage stage, bool isBreastfeeding);

        /// <summary>
        /// Analyzes the answers of the EPDS assessment to gauge depression risks.
        /// </summary>
        EpdsEvaluationResult EvaluateEpdsScore(int[] answers);

        /// <summary>
        /// Compares baby's dimensions (weight and height) against age-based development ranges.
        /// </summary>
        GrowthEvaluationResult VerifyBabyGrowth(int ageMonths, string gender, float weightKg, float heightCm);

        /// <summary>
        /// Evaluates all maternal health rules (BR01 - BR05) for a mom's profile.
        /// </summary>
        Task<List<HealthAlert>> EvaluateAsync(MomHealthProfile profile);

        /// <summary>
        /// Evaluates baby growth, nutrition, and developmental rules (BR06 - BR10).
        /// </summary>
        Task<List<HealthAlert>> EvaluateBabyAsync(BabyProfile baby, BabyFoodLog todayLog);
    }
}
