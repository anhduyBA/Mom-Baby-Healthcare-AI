import nodemailer from "nodemailer";
import twilio from "twilio";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

export const sendEmail = async (alert) => {
  try {
    await transporter.sendMail({
      from: `"Healthsync Alerts" <${process.env.SMTP_USER}>`,
      to: alert.userEmail,
      subject: `[${alert.type.toUpperCase()}] Health Alert`,
      text: `${alert.message}\nSeverity: ${alert.severity}`,
    });
    console.log("Email sent:", alert.message);
  } catch (err) {
    console.error("Email error:", err);
  }
};

const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (alert) => {
  try {
    if (!alert.userPhone) return;
    await twilioClient.messages.create({
      body: `${alert.type.toUpperCase()} Alert: ${alert.message} (Severity: ${alert.severity})`,
      from: process.env.TWILIO_PHONE,
      to: alert.userPhone,
    });
    console.log("SMS sent:", alert.message);
  } catch (err) {
    console.error("SMS error:", err);
  }
};

export const sendPush = async (alert) => {
  try {
    console.log("App Push Notification:", alert.message);
  } catch (err) {
    console.error("Push notification error:", err);
  }
};
