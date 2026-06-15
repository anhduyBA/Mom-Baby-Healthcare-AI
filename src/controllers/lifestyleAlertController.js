import LifestyleAlert from "../models/LifestyleAlert.js";

export const getLifestyleAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    } else {
      // By default return unresolved (pending) alerts
      query.status = "pending";
    }

    const alerts = await LifestyleAlert.find(query).sort({ triggeredAt: -1 });

    res.json({
      message: "Lifestyle alerts fetched successfully",
      alerts
    });
  } catch (error) {
    console.error("Error in getLifestyleAlerts:", error);
    res.status(500).json({ message: error.message });
  }
};

export const resolveLifestyleAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const alert = await LifestyleAlert.findOne({ _id: id, userId });
    if (!alert) {
      return res.status(404).json({ message: "Lifestyle alert not found" });
    }

    alert.status = "resolved";
    await alert.save();

    res.json({
      message: "Lifestyle alert resolved successfully",
      alert
    });
  } catch (error) {
    console.error("Error in resolveLifestyleAlert:", error);
    res.status(500).json({ message: error.message });
  }
};
