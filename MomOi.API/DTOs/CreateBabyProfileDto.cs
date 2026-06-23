using System;

namespace MomOi.API.DTOs
{
    public class CreateBabyProfileDto
    {
        public string Name { get; set; } = string.Empty;
        public int Gender { get; set; } // 0 = boy/male, 1 = girl/female
        public DateTime BirthDate { get; set; }
        public float BirthWeightKg { get; set; }
        public float BirthHeightCm { get; set; }
        public float CurrentWeightKg { get; set; }
        public float CurrentHeightCm { get; set; }
    }
}
