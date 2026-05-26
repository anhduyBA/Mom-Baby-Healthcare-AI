import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 10000
});

export default async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: `"Healthsync" <${process.env.SMTP_USER}>`,
    to,
    subject: subject || "Healthsync Reminder",
    text: text || "This is your medication reminder.",
  });
}
