using System;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents a log of a menstrual cycle (used during PrePregnancy stage).
    /// </summary>
    public class CycleLog
    {
        /// <summary>
        /// Unique primary key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Foreign key to MomHealthProfile.
        /// </summary>
        public int ProfileId { get; set; }

        /// <summary>
        /// Navigation property to MomHealthProfile.
        /// </summary>
        public MomHealthProfile Profile { get; set; } = null!;

        /// <summary>
        /// Date when the menstrual period started.
        /// </summary>
        public DateTime StartDate { get; set; }

        /// <summary>
        /// Date when the menstrual period ended (null if active/in-progress).
        /// </summary>
        public DateTime? EndDate { get; set; }

        /// <summary>
        /// Observed symptoms (e.g. cramps, fatigue) recorded during cycle.
        /// </summary>
        public string? Symptoms { get; set; }
    }
}
