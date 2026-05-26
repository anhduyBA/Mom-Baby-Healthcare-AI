import DietPlan from "../models/DietPlan.js";

export const generateDietPlan = async (req, res) => {
  try {
    const userId = req.user._id;

    const weeklyPlan = [
      {
        day: "Monday",
        meals: [
          { mealType: "Breakfast", recipe: "Phở bò (phần vừa)", calories: 350 },
          { mealType: "Lunch", recipe: "Cơm gà + rau luộc", calories: 550 },
          { mealType: "Dinner", recipe: "Bún thịt nướng", calories: 480 },
        ],
      },
      {
        day: "Tuesday",
        meals: [
          { mealType: "Breakfast", recipe: "Bánh mì trứng + sữa đậu", calories: 320 },
          { mealType: "Lunch", recipe: "Cơm tấm sườn (ít mỡ)", calories: 580 },
          { mealType: "Dinner", recipe: "Canh chua cá + cơm", calories: 450 },
        ],
      },
      {
        day: "Wednesday",
        meals: [
          { mealType: "Breakfast", recipe: "Xôi gà", calories: 300 },
          { mealType: "Lunch", recipe: "Mì Quảng", calories: 520 },
          { mealType: "Dinner", recipe: "Đậu hũ sốt cà + rau + cơm", calories: 420 },
        ],
      },
    ];

    const dietPlan = new DietPlan({ userId, dailyMeals: weeklyPlan });
    await dietPlan.save();

    res.json({ message: "Diet plan generated successfully", dietPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating diet plan" });
  }
};

export const getDietPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const dietPlan = await DietPlan.findOne({ userId }).sort({ createdAt: -1 });
    if (!dietPlan) return res.status(404).json({ message: "No diet plan found" });
    res.json(dietPlan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching diet plan" });
  }
};

export const updateDietPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const planData = req.body;

    const dietPlan = await DietPlan.findOneAndUpdate(
      { userId },
      { dailyMeals: planData.dailyMeals },
      { new: true }
    );

    if (!dietPlan) return res.status(404).json({ message: "No diet plan found to update" });
    res.json({ message: "Diet plan updated", dietPlan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating diet plan" });
  }
};

export const getRecipe = async (req, res) => {
  try {
    const { day, mealType } = req.query;
    const userId = req.user._id;

    const dietPlan = await DietPlan.findOne({ userId }).sort({ createdAt: -1 });
    if (!dietPlan) return res.status(404).json({ message: "No diet plan found" });

    const dayPlan = dietPlan.dailyMeals.find((d) => d.day === day);
    if (!dayPlan) return res.status(404).json({ message: "No meals found for this day" });

    const meal = dayPlan.meals.find((m) => m.mealType.toLowerCase() === mealType.toLowerCase());
    if (!meal) return res.status(404).json({ message: "Meal not found" });

    res.json(meal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching recipe" });
  }
};
