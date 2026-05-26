import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { generateReportPDF, sendReportByEmail } from "../controllers/reportPDFController.js";

const router = express.Router();


router.get("/download", authMiddleware, (req, res) => generateReportPDF(req, res, "attachment"));


router.get("/view", authMiddleware, (req, res) => generateReportPDF(req, res, "inline"));


router.post("/email", authMiddleware, sendReportByEmail);

export default router;
