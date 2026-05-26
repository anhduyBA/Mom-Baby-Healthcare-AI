import Alert from "../models/Alert.js";
import User from "../models/User.js";
import sendEmailUtil from "../utils/sendEmail.js";
import twilio from "twilio";
import { formatPhoneVN } from "../utils/phoneUtils.js";

export const createAlertInDB = async (userId, type, severity, message, channels = ["app"]) => {
  try {
    const alert = new Alert({ userId, type, severity, message, channels, status: "pending" });
    await alert.save();
    await sendNotification(alert);
    return alert;
  } catch (error) {
    console.error("Error creating alert:", error);
    throw error;
  }
};

export const sendNotification = async (alert) => {
  try {
    const user = await User.findById(alert.userId);
    if (!user) return;

    const promises = [];

    if (alert.channels.includes("email") && user.email) {
      promises.push(
        sendEmailUtil(user.email, `Health Alert: ${alert.type}`, alert.message)
          .catch(err => console.error("Email send failed:", err))
      );
    }

    if (alert.channels.includes("sms") && user.phone) {
      try {
        const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        const formattedPhone = formatPhoneVN(user.phone);

        promises.push(
          twilioClient.messages.create({
            body: `${alert.type.toUpperCase()} Alert: ${alert.message} (Severity: ${alert.severity})`,
            from: process.env.TWILIO_PHONE,
            to: formattedPhone,
          }).catch(err => console.error("SMS send failed:", err))
        );
      } catch (err) {
        console.error("Twilio initialization failed:", err);
      }
    }

    await Promise.allSettled(promises);
    alert.status = "sent";
    await alert.save();
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
};

export const createAlertManual = async (req, res) => {
  try {
    const { userId, type, severity, message, channels } = req.body;
    if (!userId || !type || !message) return res.status(400).json({ message: "Missing required fields" });

    const alert = await createAlertInDB(userId, type, severity || 50, message, channels || ["app"]);

    res.status(201).json({ message: "Alert created successfully", alert });
  } catch (error) {
    console.error("Error in createAlertManual:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const status = req.query.status;

    const query = { userId };
    if (status) query.status = status;

    const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(100);

    res.json({ message: "Alerts fetched successfully", alerts });
  } catch (error) {
    console.error("Error in getUserAlerts:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateAlertStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    if (!["pending", "sent", "resolved"].includes(status)) return res.status(400).json({ message: "Invalid status value" });

    const alert = await Alert.findOne({ _id: id, userId });
    if (!alert) return res.status(404).json({ message: "Alert not found" });

    alert.status = status;
    await alert.save();

    res.json({ message: "Alert status updated successfully", alert });
  } catch (error) {
    console.error("Error in updateAlertStatus:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const alert = await Alert.findOneAndDelete({ _id: id, userId });
    if (!alert) return res.status(404).json({ message: "Alert not found" });

    res.json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAlert:", error);
    res.status(500).json({ message: error.message });
  }
};
