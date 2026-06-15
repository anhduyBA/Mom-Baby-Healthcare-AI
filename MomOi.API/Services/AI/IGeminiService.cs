using System.Threading.Tasks;

namespace MomOi.API.Services.AI
{
    /// <summary>
    /// Result structure of a multimodal voice journal analysis from Gemini.
    /// </summary>
    public class VoiceJournalResult
    {
        public string Transcript { get; set; } = string.Empty;
        public int MoodScore { get; set; } // 1 to 10
        public string SuggestedSupport { get; set; } = string.Empty;
        public bool ShouldTakeEpds { get; set; }
    }

    /// <summary>
    /// Interacts with Google Gemini REST API to process health queries, text generations, and audio processing.
    /// </summary>
    public interface IGeminiService
    {
        /// <summary>
        /// Generates an empathetic, warm, non-clinical response in Vietnamese for mothers with postpartum depression signs.
        /// </summary>
        Task<string> GenerateEpdsResponseAsync(int epdsScore, string userProfile);

        /// <summary>
        /// Generates a friendly Gen Z-toned food safety warning with emojis and scientific reasons.
        /// </summary>
        Task<string> GenerateGenZWarningAsync(string foodName, int pregnancyWeek);

        /// <summary>
        /// Recommends traditional Vietnamese dishes that target a specific maternal nutrient gap.
        /// </summary>
        Task<string> GenerateMealSuggestionAsync(string nutrientGap, string userPrefs);

        /// <summary>
        /// Transcribes maternal audio journals and performs emotional analytics via Gemini 1.5 Pro.
        /// </summary>
        Task<VoiceJournalResult> AnalyzeVoiceJournalAsync(string audioBase64, string mimeType);
    }
}
