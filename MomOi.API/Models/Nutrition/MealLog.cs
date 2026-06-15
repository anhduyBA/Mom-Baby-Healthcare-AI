using System;

namespace MomOi.API.Models.Nutrition
{
    /// <summary>
    /// Represents a meal logged by a user for nutritional tracking.
    /// </summary>
    public class MealLog
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
        /// Time when the meal was logged.
        /// </summary>
        public DateTime LoggedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Type of meal (e.g. "Breakfast", "Lunch", "Dinner", "Snack").
        /// </summary>
        public string MealType { get; set; } = string.Empty;

        /// <summary>
        /// List of foods consumed, stored as a JSON string list in the database.
        /// </summary>
        public string[] FoodItems { get; set; } = Array.Empty<string>();

        /// <summary>
        /// Total energy content in kilocalories (kcal).
        /// </summary>
        public float Calories { get; set; }

        /// <summary>
        /// Total carbohydrates in grams.
        /// </summary>
        public float Carbs { get; set; }

        /// <summary>
        /// Total protein in grams.
        /// </summary>
        public float Protein { get; set; }

        /// <summary>
        /// Total fat in grams.
        /// </summary>
        public float Fat { get; set; }
    }
}
