import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addMedicationSchedule,
  getUserMedications,
  updateMedicationAdherence,
  deleteMedicationSchedule,
} from "../controllers/medController.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const schedule = await addMedicationSchedule(req.user._id, req.body);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const meds = await getUserMedications(req.user._id);
    res.json(meds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/adherence", authMiddleware, async (req, res) => {
  try {
    const { date, status } = req.body;
    const updatedMed = await updateMedicationAdherence(req.user._id, req.params.id, date, status);
    res.json(updatedMed);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deletedMed = await deleteMedicationSchedule(req.user._id, req.params.id);
    res.json({ message: "Deleted successfully", deletedMed });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
