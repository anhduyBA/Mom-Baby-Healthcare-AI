using System;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents a weekly log recorded by a mother during her pregnancy.
    /// </summary>
    public class PregnancyLog
    {
        /// <summary>
        /// Unique primary key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Foreign key to AppUser (linked by UserId).
        /// </summary>
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Pregnancy week of the log (1 to 42).
        /// </summary>
        public int Week { get; set; }

        /// <summary>
        /// Mother's recorded weight in kilograms.
        /// </summary>
        public float? Weight { get; set; }

        /// <summary>
        /// Systolic blood pressure (mmHg).
        /// </summary>
        public float? SystolicBp { get; set; }

        /// <summary>
        /// Diastolic blood pressure (mmHg).
        /// </summary>
        public float? DiastolicBp { get; set; }

        /// <summary>
        /// Custom notes or symptoms.
        /// </summary>
        public string? Notes { get; set; }

        /// <summary>
        /// Date when log was entry was saved.
        /// </summary>
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
