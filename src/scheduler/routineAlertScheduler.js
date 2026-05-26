import cron from "node-cron";
import User from "../models/User.js";
import { createAlertInDB, sendNotification } from "../controllers/alertController.js";
import { REMINDER_MESSAGES, SCHEDULER_UTC } from "../config/market.vn.js";

cron.schedule(`0 ${SCHEDULER_UTC.routineHealthCheckHour} * * *`, async () => {
  try {
    console.log("Running routine health checks...");

    const users = await User.find({});
    for (const user of users) {
      const alert = await createAlertInDB(
        user._id,
        "routineCheck",
        50,
        REMINDER_MESSAGES.routineCheck,
        ["email", "sms", "app"]
      );

      await sendNotification(alert);
    }

    console.log("Routine alerts sent successfully.");
  } catch (err) {
    console.error("Error in routine alert scheduler:", err);
  }
});
