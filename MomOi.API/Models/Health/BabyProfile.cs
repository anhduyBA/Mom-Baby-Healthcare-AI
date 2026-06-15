using System;
using System.Collections.Generic;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents a child profile linked to a mother.
    /// </summary>
    public class BabyProfile
    {
        /// <summary>
        /// Unique primary key for baby profile.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Reference to the AppUser ID of the mother.
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Name of the baby.
        /// </summary>
        public string BabyName { get; set; } = string.Empty;

        /// <summary>
        /// Date of birth. Used to dynamically calculate age.
        /// </summary>
        public DateTime DateOfBirth { get; set; }

        /// <summary>
        /// Gender of the baby ("male" or "female").
        /// </summary>
        public string Gender { get; set; } = string.Empty;

        /// <summary>
        /// Current weight of the baby in kilograms.
        /// </summary>
        public float? CurrentWeightKg { get; set; }

        /// <summary>
        /// Current height of the baby in centimeters.
        /// </summary>
        public float? CurrentHeightCm { get; set; }

        /// <summary>
        /// Calculated age in months based on DateOfBirth.
        /// </summary>
        public int AgeMonths => (int)((DateTime.UtcNow - DateOfBirth).TotalDays / 30.44);

        /// <summary>
        /// Allergies list, serialized as JSON.
        /// </summary>
        public string[] Allergies { get; set; } = Array.Empty<string>();

        /// <summary>
        /// Feeding/food introduction history, serialized as JSON.
        /// </summary>
        public string[] FoodHistory { get; set; } = Array.Empty<string>();

        /// <summary>
        /// Navigation collection for growth logs over time.
        /// </summary>
        public ICollection<GrowthRecord> GrowthRecords { get; set; } = new List<GrowthRecord>();
    }
}
