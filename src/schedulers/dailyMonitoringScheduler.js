import cron from "node-cron";
import DailyMonitoring from "../models/DailyMonitoring.js";
import User from "../models/User.js";
import { sendEmail, sendSMS } from "../utils/notificationUtils.js";
import { REMINDER_MESSAGES, SCHEDULER_UTC } from "../config/market.vn.js";

const sendDailyMonitoringReminder = async (user, timeOfDay) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const tpl = REMINDER_MESSAGES[timeOfDay];
  const message = {
    subject: tpl.subject,
    body: tpl.body(user.name, baseUrl),
    sms: tpl.sms(user.name, baseUrl),
  };

  try {
    if (user.email) {
      await sendEmail({ userEmail: user.email, type: "reminder", message: message.body, severity: "low" });
    }
    if (user.phone) {
      await sendSMS({ userPhone: user.phone, type: "reminder", message: message.sms, severity: "low" });
    }
    console.log(`✅ ${timeOfDay} reminder sent to ${user.email}`);
  } catch (error) {
    console.error(`Error sending reminder to ${user.email}:`, error);
  }
};

const scheduleReminder = (hourUTC, timeOfDay) => {
  cron.schedule(`30 ${hourUTC} * * *`, async () => {
    try {
      const users = await User.find({ isActive: true });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (const user of users) {
        const todayEntry = await DailyMonitoring.findOne({
          userId: user._id,
          date: { $gte: today, $lt: tomorrow }
        });

        if (!todayEntry) await sendDailyMonitoringReminder(user, timeOfDay);
      }
    } catch (error) {
      console.error(`Error in ${timeOfDay} reminder:`, error);
    }
  });
  console.log(`✅ ${timeOfDay} reminder scheduled`);
};

export const initializeDailyMonitoringSchedulers = () => {
  scheduleReminder(SCHEDULER_UTC.monitoringMorningHour, "morning");  // 7:00 VN (UTC+7)
  scheduleReminder(SCHEDULER_UTC.monitoringEveningHour, "evening"); // 20:00 VN
  console.log("✅ Daily Monitoring Schedulers initialized (giờ Việt Nam)");
};
