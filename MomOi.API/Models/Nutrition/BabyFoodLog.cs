using System;

namespace MomOi.API.Models.Nutrition
{
    /// <summary>
    /// Represents daily nutritional intake and feeding logs for a baby.
    /// </summary>
    public class BabyFoodLog
    {
        public int Id { get; set; }
        public int BabyProfileId { get; set; }
        public DateTime LoggedAt { get; set; } = DateTime.UtcNow;
        public float TotalIronMg { get; set; }
        public string MealTexture { get; set; } = string.Empty; // e.g. "puree", "mashed", "lumpy", "solid"
        public bool NewFoodIntroduced { get; set; }
        public string? IntroducedFoodName { get; set; }
        public string[] AllergySymptoms { get; set; } = Array.Empty<string>(); // e.g. ["nổi mẩn", "nôn"]
        public int WeeklyFishServings { get; set; }
    }
}
