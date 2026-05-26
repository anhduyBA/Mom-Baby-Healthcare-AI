import express from "express";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./src/routes/authRoutes.js";
import symptomRoutes from "./src/routes/symptomRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import reportPdfRoutes from "./src/routes/reportPdfRoutes.js";
import medRoutes from "./src/routes/medRoutes.js";
import dailyMonitoringRoutes from "./src/routes/dailyMonitoringRoutes.js";
import chatRoutes from "./src/routes/chatRoutes.js";
import dietRoutes from "./src/routes/dietRoutes.js";
import alertRoutes from "./src/routes/alertRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";

import "./src/scheduler/medReminderScheduler.js";
import "./src/scheduler/routineAlertScheduler.js";
import { initializeDailyMonitoringSchedulers } from "./src/schedulers/dailyMonitoringScheduler.js";

dotenv.config();

const app = express();

app.set('trust proxy', 1); // Trust first proxy (Render)
app.use(express.json());
connectDB();
app.use("/uploads", express.static("uploads"));

app.use(cors({
  origin: ["http://localhost:5173", "https://healthsync-care.vercel.app"],
  credentials: true
}));


app.get("/", (req, res) => {
  res.send("HealthSync Backend is Running!");
});

app.use("/api/auth", authRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/report/pdf", reportPdfRoutes);
app.use("/api/medications", medRoutes);
app.use("/api/daily-monitoring", dailyMonitoringRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/diet", dietRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/ai", aiRoutes);

initializeDailyMonitoringSchedulers();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
