import cron from "node-cron";
import MedSchedule from "../models/MedSchedule.js";
import User from "../models/User.js";
import MedAlert from "../models/MedAlert.js";
import { createAlertInDB } from "../controllers/alertController.js";
import { REMINDER_MESSAGES } from "../config/market.vn.js";

const hasReminderBeenSent = (med, now) => {
  const todayStr = now.toDateString();
  return med.adherenceLog?.some(log => log.date.toDateString() === todayStr && log.status === "taken");
};

const logMedAlert = async (med, userId, now) => {
  try {
    await MedAlert.create({
      userId,
      medName: med.medName,
      date: now,
      status: "sent",
      channel: "email,sms,app",
    });
  } catch (err) {
    console.error("Error logging MedAlert:", err);
  }
};

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const timeNow = now.toTimeString().slice(0, 5);

    const meds = await MedSchedule.find({ startDate: { $lte: now }, endDate: { $gte: now } });

    for (const med of meds) {
      if (med.times.includes(timeNow) && !hasReminderBeenSent(med, now)) {
        const user = await User.findById(med.userId);
        if (!user || !user.email) continue;

        try {
          await createAlertInDB(
            user._id,
            "medication",
            50,
            REMINDER_MESSAGES.medication(med.medName, med.dosage),
            ["email", "sms", "app"]
          );

          await logMedAlert(med, user._id, now);
          console.log(`[${now.toLocaleString()}] Reminder sent for ${med.medName} to ${user.email}`);
        } catch (alertErr) {
          console.error(`Error sending alert for ${med.medName}:`, alertErr);
        }
      }
    }
  } catch (err) {
    console.error("Error in medication scheduler:", err);
  }
});
