using System;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents a recovery log recorded by a mother postpartum.
    /// </summary>
    public class PostpartumLog
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
        /// Days elapsed since delivery date.
        /// </summary>
        public int DaysPostpartum { get; set; }

        /// <summary>
        /// Bleeding status classification (None, Light, Medium, Heavy).
        /// </summary>
        public string? BleedingStatus { get; set; }

        /// <summary>
        /// Brief mood summary.
        /// </summary>
        public string? Mood { get; set; }

        /// <summary>
        /// Custom notes or recovery symptoms.
        /// </summary>
        public string? Notes { get; set; }

        /// <summary>
        /// Date when log was saved.
        /// </summary>
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
