using System;
using System.Linq;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents an Edinburgh Postnatal Depression Scale (EPDS) screening assessment.
    /// </summary>
    public class EpdsAssessment
    {
        /// <summary>
        /// Unique primary key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Foreign key reference to MomHealthProfile.
        /// </summary>
        public int ProfileId { get; set; }

        /// <summary>
        /// Navigation property to MomHealthProfile.
        /// </summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public MomHealthProfile Profile { get; set; } = null!;

        /// <summary>
        /// Collection of 10 answer values (0-3 score each) for the EPDS questionnaire.
        /// </summary>
        public int[] Answers { get; set; } = new int[10];

        /// <summary>
        /// Total score of all answered questions.
        /// </summary>
        public int TotalScore => Answers.Sum();

        /// <summary>
        /// If score >= 13, critical depression risk is indicated.
        /// </summary>
        public bool IsUrgent => TotalScore >= 13;

        /// <summary>
        /// Timestamp when the test was taken.
        /// </summary>
        public DateTime TakenAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gemini-generated insight based on the scores.
        /// </summary>
        public string? AiAnalysis { get; set; }
    }
}
