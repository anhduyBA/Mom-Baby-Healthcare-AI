namespace MomOi.API.DTOs
{
    /// <summary>
    /// Standard generic response wrapper for all API endpoints.
    /// </summary>
    /// <typeparam name="T">Type of data payload.</typeparam>
    public class ApiResponse<T>
    {
        /// <summary>
        /// Indicates if the request was successful.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Message describing the outcome (for success details or error reasons).
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Data payload returned by the endpoint (null if empty or failed).
        /// </summary>
        public T? Data { get; set; }

        /// <summary>
        /// Creates a success response.
        /// </summary>
        public static ApiResponse<T> SuccessResult(T data, string message = "Thao tác thành công.")
        {
            return new ApiResponse<T> { Success = true, Message = message, Data = data };
        }

        /// <summary>
        /// Creates a failure response.
        /// </summary>
        public static ApiResponse<T> FailureResult(string message)
        {
            return new ApiResponse<T> { Success = false, Message = message, Data = default };
        }
    }
}
