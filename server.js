import express from "express";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

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
import lifestyleRoutes from "./src/routes/lifestyleRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import recipeRoutes from "./src/routes/recipeRoutes.js";
import swaggerSpec from "./src/config/swagger.js";

import "./src/scheduler/medReminderScheduler.js";
import "./src/scheduler/routineAlertScheduler.js";
import { initializeDailyMonitoringSchedulers } from "./src/schedulers/dailyMonitoringScheduler.js";
import { initializeLifestyleCronJobs } from "./src/jobs/reminderJob.js";
import { initProfileClustering } from "./src/services/profileService.js";

dotenv.config();

const app = express();

app.set('trust proxy', 1); // Trust first proxy (Render)
app.use(express.json());

// Global response interceptor to enforce the Unified API Response Format
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === 'object' && body.success !== undefined && body.timestamp !== undefined) {
      return originalJson.call(this, body);
    }

    const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    let data = isSuccess ? body : null;
    let errors = !isSuccess ? [body?.message || "An error occurred"] : null;
    let message = body?.message || (isSuccess ? "Success" : "Error");

    if (body && typeof body === 'object') {
      if (body.data !== undefined) {
        data = body.data;
      }
      if (body.errors !== undefined) {
        errors = Array.isArray(body.errors) ? body.errors : [body.errors];
      } else if (body.error !== undefined) {
        errors = Array.isArray(body.error) ? body.error : [body.error];
      }
    }

    const unifiedResponse = {
      success: isSuccess,
      data: isSuccess ? data : null,
      message,
      errors: isSuccess ? null : (errors || ["Unknown error"]),
      timestamp: new Date().toISOString()
    };

    return originalJson.call(this, unifiedResponse);
  };
  next();
});

connectDB();
app.use("/uploads", express.static("uploads"));

app.use(cors({
  origin: true,
  credentials: true
}));


app.get("/", (req, res) => {
  res.send("HealthSync Backend is Running!");
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.use("/api/auth", authRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/report/pdf", reportPdfRoutes);
app.use("/api/medications", medRoutes);
app.use("/api/daily-monitoring", dailyMonitoringRoutes);
app.use("/api/lifestyle", lifestyleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/diet", dietRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/ai", aiRoutes);

initializeDailyMonitoringSchedulers();
initializeLifestyleCronJobs();
initProfileClustering();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
