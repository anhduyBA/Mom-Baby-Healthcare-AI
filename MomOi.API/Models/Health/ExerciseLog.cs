using System;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Represents physical exercise or daily step logs recorded by a pregnant user.
    /// </summary>
    public class ExerciseLog
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int StepCount { get; set; }
        public string ExerciseType { get; set; } = string.Empty; // e.g. "Walking", "Yoga", "Swimming"
        public int DurationMinutes { get; set; }
        public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    }
}
