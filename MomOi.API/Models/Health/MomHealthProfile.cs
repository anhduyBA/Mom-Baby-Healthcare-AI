using MomOi.API.Models.Identity;
using System;
using System.Collections.Generic;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Stages in the maternal journey.
    /// </summary>
    public enum JourneyStage
    {
        PrePregnancy,
        Pregnant,
        Postpartum
    }

    /// <summary>
    /// Stores health metrics only. Separated from user PII tables (Decree 13/2023/ND-CP compliance).
    /// </summary>
    public class MomHealthProfile
    {
        /// <summary>
        /// Unique primary key for health profile.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Foreign key reference to AppUser.
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Navigation property to AppUser.
        /// </summary>
        public AppUser User { get; set; } = null!;

        /// <summary>
        /// Current stage of journey (PrePregnancy, Pregnant, Postpartum).
        /// </summary>
        public JourneyStage Stage { get; set; } = JourneyStage.PrePregnancy;

        /// <summary>
        /// Current week of pregnancy, if applicable.
        /// </summary>
        public int? PregnancyWeek { get; set; }

        /// <summary>
        /// Body Mass Index (BMI).
        /// </summary>
        public float? Bmi { get; set; }

        /// <summary>
        /// Blood glucose level (mmol/L or mg/dL).
        /// </summary>
        public float? BloodSugarLevel { get; set; }

        /// <summary>
        /// Indicates if the mother has gestational diabetes.
        /// </summary>
        public bool HasGestDiabetes { get; set; }

        /// <summary>
        /// Medical conditions, serialized as a JSON string array in DB.
        /// </summary>
        public string[]? MedicalConditions { get; set; }

        /// <summary>
        /// Average cycle length in days, if tracking fertility.
        /// </summary>
        public int? AvgCycleLength { get; set; }

        /// <summary>
        /// Start date of the last menstrual period.
        /// </summary>
        public DateTime? LastPeriodDate { get; set; }

        /// <summary>
        /// Delivery date of the child.
        /// </summary>
        public DateTime? DeliveryDate { get; set; }

        /// <summary>
        /// Indicates if the mother is currently breastfeeding.
        /// </summary>
        public bool IsBreastfeeding { get; set; }

        /// <summary>
        /// Time of last metrics update.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Navigation collection for menstrual cycle logs.
        /// </summary>
        public ICollection<CycleLog> CycleLogs { get; set; } = new List<CycleLog>();

        /// <summary>
        /// Navigation collection for Edinburgh Postnatal Depression Scale assessments.
        /// </summary>
        public ICollection<EpdsAssessment> EpdsAssessments { get; set; } = new List<EpdsAssessment>();
    }
}
