using MomOi.API.Models.Health;
using System;

namespace MomOi.API.DTOs
{
    public class UpdateMomProfileDto
    {
        public JourneyStage Stage { get; set; }
        public int? PregnancyWeek { get; set; }
        public float? Bmi { get; set; }
        public float? BloodSugarLevel { get; set; }
        public bool HasGestDiabetes { get; set; }
        public string[]? MedicalConditions { get; set; }
        public int? AvgCycleLength { get; set; }
        public DateTime? LastPeriodDate { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public bool IsBreastfeeding { get; set; }
    }
}
