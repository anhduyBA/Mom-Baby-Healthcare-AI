using System;

namespace MomOi.API.Models.Health
{
    /// <summary>
    /// Severity levels for health alerts.
    /// </summary>
    public enum AlertSeverity
    {
        Critical,
        Warning,
        Info,
        Positive
    }

    /// <summary>
    /// Logs critical and warning clinical alerts triggered by the business rules engine.
    /// </summary>
    public class CriticalAlertLog
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string RuleId { get; set; } = string.Empty;
        public AlertSeverity Severity { get; set; } = AlertSeverity.Info;
        public string TitleVi { get; set; } = string.Empty;
        public string MessageVi { get; set; } = string.Empty;
        public string SuggestionVi { get; set; } = string.Empty;
        public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
        public bool IsResolved { get; set; } = false;
    }
}
