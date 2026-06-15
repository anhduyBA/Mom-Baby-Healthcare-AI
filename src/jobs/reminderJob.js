import cron from "node-cron";
import User from "../models/User.js";
import LifestyleEntry from "../models/LifestyleEntry.js";
import sendEmail from "../utils/sendEmail.js";
import fs from "fs";
import path from "path";
import admin, { firebaseInitialized } from "../config/firebase.js";

/**
 * Sends a daily reminder at 21:00 to students who have not yet submitted their lifestyle entry.
 */
export async function sendDailySubmissionReminder() {
  console.log("Running Daily Submission Reminder Job...");
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch all student users
    const students = await User.find({ userType: "student" });
    
    for (const student of students) {
      // 2. Check if an entry exists for today
      const entry = await LifestyleEntry.findOne({
        userId: student._id,
        date: today
      });

      if (!entry) {
        // 3. Send email reminder
        if (student.email) {
          const subject = "Nhắc nhở hoàn thành nhật ký lối sống hàng ngày";
          const text = `Xin chào ${student.name},\n\nBạn chưa ghi nhận thông tin lối sống ngày hôm nay. Hãy dành ra 1 phút đăng ký thông tin để theo dõi chỉ số sức khỏe của mình nhé!\n\nTrân trọng,\nĐội ngũ Healthsync`;
          
          await sendEmail(student.email, subject, text).catch(err => 
            console.error(`Failed to send reminder email to ${student.email}:`, err)
          );
        }
      }
    }
    console.log("Daily Submission Reminder Job finished.");
  } catch (error) {
    console.error("Error in sendDailySubmissionReminder:", error);
  }
}

/**
 * Sends a warning email at 08:00 to students who have triggered HIGH alerts for 3 consecutive days,
 * and notifies the administrator.
 */
export async function checkConsecutiveHighAlerts() {
  console.log("Running Consecutive High Alerts Check Job...");
  try {
    // 1. Fetch all student users
    const students = await User.find({ userType: "student" });

    for (const student of students) {
      // 2. Fetch the 3 most recent daily entries
      const entries = await LifestyleEntry.find({ userId: student._id })
        .sort({ date: -1 })
        .limit(3);

      // Check if they have at least 3 entries
      if (entries.length < 3) continue;

      // 3. Check if all 3 entries are consecutive days
      const d0 = new Date(entries[0].date);
      const d1 = new Date(entries[1].date);
      const d2 = new Date(entries[2].date);

      const diff1 = Math.abs(d0 - d1);
      const diff2 = Math.abs(d1 - d2);

      const oneDayMs = 1000 * 60 * 60 * 24;
      const isConsecutive = Math.ceil(diff1 / oneDayMs) === 1 && Math.ceil(diff2 / oneDayMs) === 1;

      if (!isConsecutive) continue;

      // 4. Check if each day has at least one HIGH alert
      const hasHighAlert0 = entries[0].alerts.some(a => a.severity === "HIGH");
      const hasHighAlert1 = entries[1].alerts.some(a => a.severity === "HIGH");
      const hasHighAlert2 = entries[2].alerts.some(a => a.severity === "HIGH");

      if (hasHighAlert0 && hasHighAlert1 && hasHighAlert2) {
        // 5. Send alert to student
        if (student.email) {
          const subject = "Cảnh báo: Tình trạng sức khỏe & lối sống đáng báo động";
          const text = `Xin chào ${student.name},\n\nHệ thống ghi nhận bạn đã nhận cảnh báo lối sống mức độ CAO (HIGH) trong 3 ngày liên tiếp. Điều này có thể ảnh hưởng xấu đến sức khỏe tinh thần và thể chất của bạn.\n\nVui lòng điều chỉnh lịch học, tăng thời gian ngủ nghỉ và tham khảo ý kiến chuyên gia y tế nếu cần thiết.\n\nThân mến,\nĐội ngũ Healthsync`;
          
          await sendEmail(student.email, subject, text).catch(err => 
            console.error(`Failed to send warning email to student ${student.email}:`, err)
          );
        }

        // 6. Notify admin (log output and send email to admin address if configured)
        console.warn(`[ADMIN WARNING] Student ${student.name} (${student.email}) has triggered HIGH alerts for 3 consecutive days!`);
        const adminEmail = process.env.SMTP_USER || "admin@example.com";
        const adminSubject = `[CẢNH BÁO NGUY CƠ CAO] Sinh viên ${student.name} gặp bất ổn lối sống`;
        const adminText = `Kính gửi Ban Quản trị,\n\nSinh viên ${student.name} (Email: ${student.email}) đã kích hoạt các cảnh báo nghiêm trọng (HIGH) liên tiếp trong 3 ngày qua.\n\nThông tin chi tiết:\n- Tên: ${student.name}\n- Email: ${student.email}\n- Điểm sức khỏe gần nhất: ${entries[0].healthScore}/100\n\nVui lòng theo dõi và đưa ra hỗ trợ kịp thời.\n\nTrân trọng,\nĐội ngũ Healthsync`;
        
        await sendEmail(adminEmail, adminSubject, adminText).catch(err => 
          console.error(`Failed to send admin notification email:`, err)
        );
      }
    }
    console.log("Consecutive High Alerts Check Job finished.");
  } catch (error) {
    console.error("Error in checkConsecutiveHighAlerts:", error);
  }
}

/**
 * Periodically deletes local/Firebase symptom images older than 30 days.
 */
export async function cleanupOldImages() {
  console.log("Running Old Images Cleanup Job...");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 1. Clean local uploads folder
  const localDir = path.join("uploads", "symptoms");
  if (fs.existsSync(localDir)) {
    try {
      const files = fs.readdirSync(localDir);
      for (const file of files) {
        const filePath = path.join(localDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`[Cleanup] Deleted local symptom image: ${file}`);
        }
      }
    } catch (err) {
      console.error("[Cleanup Error] Local cleanup failed:", err.message);
    }
  }

  // 2. Clean Firebase storage bucket
  if (firebaseInitialized) {
    try {
      const bucket = admin.storage().bucket();
      const [files] = await bucket.getFiles({ prefix: "symptoms/" });
      for (const file of files) {
        const [metadata] = await file.getMetadata();
        const created = new Date(metadata.timeCreated);
        if (created < thirtyDaysAgo) {
          await file.delete();
          console.log(`[Cleanup] Deleted firebase symptom image: ${file.name}`);
        }
      }
    } catch (err) {
      console.error("[Cleanup Error] Firebase cleanup failed:", err.message);
    }
  }
  console.log("Old Images Cleanup Job finished.");
}

/**
 * Initialize all scheduled cron jobs.
 */
export function initializeLifestyleCronJobs() {
  // Every day at 21:00 VN Time
  cron.schedule("0 21 * * *", sendDailySubmissionReminder, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  // Every day at 08:00 VN Time
  cron.schedule("0 8 * * *", checkConsecutiveHighAlerts, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  // Every day at 00:00 VN Time
  cron.schedule("0 0 * * *", cleanupOldImages, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log("Lifestyle cron jobs initialized successfully.");
}
