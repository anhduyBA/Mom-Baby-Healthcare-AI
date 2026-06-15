namespace MomOi.API.Models.Nutrition
{
    /// <summary>
    /// Represents an allergen constraint/record for a maternal user.
    /// </summary>
    public class FoodAllergyRecord
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
        /// The allergen substance (e.g. "Peanuts", "Shellfish").
        /// </summary>
        public string Allergen { get; set; } = string.Empty;

        /// <summary>
        /// Severity of the allergic reaction (e.g. "Mild", "Moderate", "Severe").
        /// </summary>
        public string Severity { get; set; } = string.Empty;

        /// <summary>
        /// Observed symptoms (e.g. "Hives", "Swelling", "Anaphylaxis").
        /// </summary>
        public string Symptoms { get; set; } = string.Empty;
    }
}
