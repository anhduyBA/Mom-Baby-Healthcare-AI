using System;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents a historical growth log (weight/height checkpoint) for a baby.
    /// </summary>
    public class GrowthRecord
    {
        /// <summary>
        /// Unique primary key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Foreign key to BabyProfile.
        /// </summary>
        public int BabyProfileId { get; set; }

        /// <summary>
        /// Navigation property to BabyProfile.
        /// </summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public BabyProfile BabyProfile { get; set; } = null!;

        /// <summary>
        /// Date when metrics were recorded.
        /// </summary>
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Recorded weight in kilograms.
        /// </summary>
        public float WeightKg { get; set; }

        /// <summary>
        /// Recorded height in centimeters.
        /// </summary>
        public float HeightCm { get; set; }
    }
}
