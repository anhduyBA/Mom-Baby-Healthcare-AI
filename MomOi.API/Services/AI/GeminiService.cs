using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MomOi.API.Services.AI
{
    /// <summary>
    /// Service to call Google Gemini API for maternal and baby insights.
    /// </summary>
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["GEMINI_API_KEY"] ?? configuration["Gemini:ApiKey"];

            // Increase timeout for audio processing
            _httpClient.Timeout = TimeSpan.FromSeconds(60);
        }

        public async Task<string> GenerateEpdsResponseAsync(int epdsScore, string userProfile)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("Gemini API key is not configured. Using local fallback response.");
                return GetEpdsFallback(epdsScore);
            }

            try
            {
                var prompt = $"Hãy đóng vai một chuyên gia tư vấn tâm lý sản khoa vô cùng ấm áp, thấu cảm. " +
                             $"Viết một lời phản hồi động viên bằng tiếng Việt (không dùng từ ngữ y khoa chuyên môn lạnh lùng, dùng từ ngữ ấm áp, gần gũi, có biểu tượng cảm xúc như 💙) " +
                             $"cho người mẹ vừa làm bài kiểm tra trầm cảm sau sinh EPDS với tổng điểm là {epdsScore}/30. " +
                             $"Thông tin thêm về hồ sơ của mẹ: {userProfile}. Hãy viết ngắn gọn dưới 150 từ.";

                return await CallGeminiTextApiAsync(prompt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini for EPDS Response. Using fallback.");
                return GetEpdsFallback(epdsScore);
            }
        }

        public async Task<string> GenerateGenZWarningAsync(string foodName, int pregnancyWeek)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("Gemini API key is not configured. Using local fallback response.");
                return GetGenZFallback(foodName, pregnancyWeek);
            }

            try
            {
                var prompt = $"Hãy viết một lời cảnh báo bằng giọng điệu Gen Z cực kỳ thân thiện, đáng yêu, dí dỏm " +
                             $"(không phán xét hay cấm đoán tiêu cực, sử dụng nhiều biểu tượng cảm xúc như 💙❤️🙅‍♀️, xưng hô mami - bé cưng) " +
                             $"về việc mẹ bầu ăn món '{foodName}' ở tuần thai thứ {pregnancyWeek}. " +
                             $"Giải thích lý do khoa học một cách cực kỳ ngắn gọn, dễ hiểu và gợi ý món ăn thay thế truyền thống của Việt Nam an toàn hơn.";

                return await CallGeminiTextApiAsync(prompt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini for Gen Z Warning. Using fallback.");
                return GetGenZFallback(foodName, pregnancyWeek);
            }
        }

        public async Task<string> GenerateMealSuggestionAsync(string nutrientGap, string userPrefs)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("Gemini API key is not configured. Using local fallback response.");
                return $"[Gợi ý Dinh dưỡng] Mami nên bổ sung thêm các món ăn giàu {nutrientGap} như: canh cua rau đay, cháo bồ câu hạt sen hoặc cá hồi áp chảo. Đây là những món truyền thống Việt Nam rất tốt cho thai kỳ và phù hợp với mami.";
            }

            try
            {
                var prompt = $"Gợi ý 3 món ăn truyền thống Việt Nam tốt cho sức khỏe mẹ bầu để bổ sung chất dinh dưỡng còn thiếu: {nutrientGap}. " +
                             $"Sở thích/yêu cầu của mẹ: {userPrefs}. Viết bằng tiếng Việt, ngắn gọn, chỉ ra tại sao món đó bổ sung được chất thiếu.";

                return await CallGeminiTextApiAsync(prompt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini for Meal Suggestion. Using fallback.");
                return $"[Gợi ý Dinh dưỡng] Mami nên bổ sung thêm các món ăn giàu {nutrientGap} như: canh cua rau đay, cháo bồ câu hạt sen hoặc cá hồi áp chảo. Đây là những món truyền thống Việt Nam rất tốt cho thai kỳ và phù hợp với mami.";
            }
        }

        public async Task<VoiceJournalResult> AnalyzeVoiceJournalAsync(string audioBase64, string mimeType)
        {
            var fallback = new VoiceJournalResult
            {
                Transcript = "Hôm nay mình thấy hơi mệt mỏi trong người, cảm giác chăm con một mình hơi đuối sức và đôi lúc lo lắng quá mức...",
                MoodScore = 5,
                SuggestedSupport = "Mami đang cảm thấy hơi quá tải. Hãy dành 15-30 phút nghỉ ngơi hoàn toàn, nhờ chồng hoặc người thân trông bé giúp và chia sẻ suy nghĩ nhé.",
                ShouldTakeEpds = true
            };

            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("Gemini API key is not configured. Using voice journal local fallback.");
                return fallback;
            }

            try
            {
                // Prepare request body for multimodal Gemini API call
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new object[]
                            {
                                new
                                {
                                    inlineData = new
                                    {
                                        mimeType = mimeType,
                                        data = audioBase64
                                    }
                                },
                                new
                                {
                                    text = "Hãy lắng nghe file âm thanh nhật ký tâm sự của mẹ sau sinh này. Hãy thực hiện: " +
                                           "1. Phiên âm đầy đủ bằng tiếng Việt (transcript).\n" +
                                           "2. Đánh giá mức độ tâm trạng từ 1 đến 10 (moodScore), trong đó 1 là rất buồn/lo âu/stress, 10 là vui vẻ/tích cực.\n" +
                                           "3. Đưa ra gợi ý lời khuyên hỗ trợ tâm lý ấm áp bằng tiếng Việt (suggestedSupport).\n" +
                                           "4. Quyết định xem mẹ có nên làm bài đánh giá EPDS đầy đủ hay không (shouldTakeEpds, đặt thành true nếu moodScore <= 6).\n\n" +
                                           "Trả về kết quả dưới dạng JSON có cấu trúc chính xác sau:\n" +
                                           "{\n" +
                                           "  \"transcript\": \"nội dung phiên âm\",\n" +
                                           "  \"moodScore\": 6,\n" +
                                           "  \"suggestedSupport\": \"lời khuyên cụ thể\",\n" +
                                           "  \"shouldTakeEpds\": true\n" +
                                           "}"
                                }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        responseMimeType = "application/json"
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(requestBody);
                var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={_apiKey}";

                var request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
                {
                    Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
                };

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini Multimodal API returned status code {StatusCode}. Error: {Error}", response.StatusCode, errorContent);
                    return fallback;
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(responseContent);
                var textResponse = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrEmpty(textResponse))
                {
                    return fallback;
                }

                var result = JsonSerializer.Deserialize<VoiceJournalResult>(textResponse, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return result ?? fallback;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to analyze voice journal with Gemini 1.5 Pro. Returning fallback.");
                return fallback;
            }
        }

        #region Helper Request Handlers

        private async Task<string> CallGeminiTextApiAsync(string prompt)
        {
            var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";
            
            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                }
            };

            var jsonPayload = JsonSerializer.Serialize(requestBody);
            var request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
            };

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Gemini API error ({response.StatusCode}): {errorContent}");
            }

            var responseContent = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseContent);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text?.Trim() ?? string.Empty;
        }

        private string GetEpdsFallback(int score)
        {
            if (score >= 13)
            {
                return "Mami ơi, điểm đánh giá của mami là khá cao ({score}/30). Hành trình sau sinh đầy thử thách và những xáo trộn tâm lý là điều hoàn toàn tự nhiên. Mami đừng chịu đựng một mình nha, hãy chia sẻ cùng gia đình hoặc kết nối với chuyên gia hỗ trợ của MomOi nhé. Yêu thương và ôm mami thật chặt 💙.";
            }
            else if (score >= 9)
            {
                return "Mami đang cảm thấy hơi bất ổn một chút đúng không nè? Dành thời gian nghỉ ngơi, chợp mắt khi bé ngủ và chia sẻ việc chăm con với chồng nha mami. Cố lên mami ơi 💙.";
            }
            return "Thật tuyệt vời khi thấy tinh thần của mami đang rất thoải mái và ổn định! Hãy tiếp tục duy trì tâm lý tích cực này và tận hưởng những khoảnh khắc đáng yêu bên bé yêu nhé 💙.";
        }

        private string GetGenZFallback(string foodName, int week)
        {
            return $"Ét o ét! Món '{foodName}' ở tuần thứ {week} hổng ổn tí nào nha mami ơi 🙅‍♀️. " +
                   $"Món này có nguy cơ tiềm ẩn chứa các loại ký sinh trùng hoặc lượng thủy ngân cao làm ảnh hưởng đến bé cưng đó nè. " +
                   $"Mami hãy cố gắng kiêng một xíu và đổi sang ăn các món chín hoàn toàn như Phở bò tái chín kỹ bốc khói hoặc cháo thịt băm nha, vừa ấm bụng lại an toàn tuyệt đối luôn mami ơi 💙.";
        }

        #endregion
    }
}
