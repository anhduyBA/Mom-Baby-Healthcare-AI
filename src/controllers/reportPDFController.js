import PDFDocument from "pdfkit";
import fs from "fs";
import nodemailer from "nodemailer";
import { formatReportData } from "../utils/reportFormatter.js";

const header = (doc, formatted, pageWidth) => {};
const footer = (doc) => {};

const renderSummary = (doc, formatted, days) => {
  doc.fontSize(12).text(`Summary (Last ${days} days)`, { underline: true });
  doc.text(`Avg Severity: ${formatted.summary.avgSeverity30}`);
  doc.text(`Max Severity: ${formatted.summary.maxSeverity} (${formatted.summary.maxSeverityLabel})`);
  doc.text(`Total Submissions: ${formatted.summary.totalEntries}`);
  doc.text(`Alerts Triggered: ${formatted.summary.alertCount}`);
  doc.moveDown();
};

const renderEntriesTable = (doc, formatted) => {
  doc.fontSize(12).text("Symptom History", { underline: true });
  formatted.entries.forEach((e) => {
    doc.fontSize(10).text(`${e.date} — Severity: ${e.severity} (${e.severityLabel})`);
    doc.text(e.description);
    if (e.modelResult && Object.keys(e.modelResult).length) {
      doc.text(`AI: ${JSON.stringify(e.modelResult)}`);
    }
    doc.moveDown();
  });
};

const renderAlerts = (doc, formatted) => {
  if (!formatted.alerts?.length) return;
  doc.addPage();
  doc.fontSize(12).text("Alert Log", { underline: true });
  formatted.alerts.forEach((a) => {
    doc.fontSize(10).text(`${a.date} — Severity: ${a.severity} (${a.severityLabel})`);
    doc.fontSize(9).text(a.description);
    doc.moveDown();
  });
};

export const generateReportPDF = async (req, res, disposition = "attachment") => {
  try {
    const userId = req.user._id;
    const days = Number(req.query.range) || 30;
    const formatted = await getFormattedUserData(userId, days);

    const filename = `health-report-${userId}-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    header(doc, formatted, pageWidth);
    renderSummary(doc, formatted, days);
    renderEntriesTable(doc, formatted);
    renderAlerts(doc, formatted);
    footer(doc);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

export const sendReportByEmail = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const chunks = [];
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 465,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      });

      await transporter.sendMail({
        from: `"Healthsync" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: "Your Healthsync Report",
        text: "Please find your health report attached.",
        attachments: [{ filename: `health-report.pdf`, content: pdfBuffer }]
      });

      res.json({ message: "Report emailed successfully!" });
    });

    const days = Number(req.body.range) || 30;
    const formatted = await getFormattedUserData(req.user._id, days);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    header(doc, formatted, pageWidth);
    renderSummary(doc, formatted, days);
    renderEntriesTable(doc, formatted);
    renderAlerts(doc, formatted);
    footer(doc);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending report via email" });
  }
};

const getFormattedUserData = async (userId, days) => {
  const User = (await import("../models/User.js")).default;
  const SymptomEntry = (await import("../models/SymptomEntry.js")).default;

  const user = await User.findById(userId).select("-password");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const entriesRaw = await SymptomEntry.find({ userId, createdAt: { $gte: since } }).sort({ createdAt: -1 });
  const alertsRaw = await SymptomEntry.find({ userId, alertFlag: true }).sort({ createdAt: -1 });

  const raw = {
    user,
    summary: {
      totalEntries: entriesRaw.length,
      alertCount: alertsRaw.length,
      maxSeverity: entriesRaw.length ? Math.max(...entriesRaw.map((e) => e.severityScore || 0)) : 0,
      avgSeverity30: entriesRaw.length ? +(entriesRaw.map((e) => e.severityScore || 0).reduce((a, b) => a + b, 0) / entriesRaw.length).toFixed(2) : 0
    },
    entries: entriesRaw.map((e) => ({
      date: e.createdAt,
      description: e.textDescription,
      severity: e.severityScore,
      modelResult: e.modelResult,
      images: e.images || []
    })),
    alerts: alertsRaw
  };

  return formatReportData(raw);
};
