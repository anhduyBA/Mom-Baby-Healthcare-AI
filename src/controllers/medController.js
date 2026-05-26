import MedSchedule from "../models/MedSchedule.js";
import { createAlertInDB, sendNotification } from "./alertController.js";

export const checkMissedDoses = async () => {
  const meds = await MedSchedule.find({});
  const now = new Date();

  for (const med of meds) {
    const today = now.toISOString().slice(0, 10);

    med.times.forEach(async (time) => {
      const doseDateTime = new Date(`${today}T${time}:00`);
      if (now > doseDateTime) {
        const takenLog = med.adherenceLog.find(
          (l) => l.date.toISOString().slice(0, 10) === today && l.status === "taken"
        );
        if (!takenLog) {
          const alert = await createAlertInDB(
            med.userId,
            "medication",
            50,
            `Missed dose for ${med.medName} at ${time}`,
            ["email", "sms", "app"]
          );
          await sendNotification(alert);
        }
      }
    });
  }
};

export const addMedicationSchedule = async (userId, data) => {
  const { medName, dosage, times, startDate, endDate, notes } = data;

  if (!medName || !dosage || !times || !startDate || !endDate) {
    throw new Error("Missing required fields");
  }

  if (!Array.isArray(times) || times.some((t) => !/^\d{2}:\d{2}$/.test(t))) {
    throw new Error("Invalid times array. Format should be ['HH:mm', ...]");
  }

  const schedule = new MedSchedule({
    userId,
    medName,
    dosage,
    times,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    notes,
    adherenceLog: [],
  });

  return await schedule.save();
};

export const getUserMedications = async (userId) => {
  const now = new Date();
  return await MedSchedule.find({ userId, endDate: { $gte: now } }).sort({ startDate: 1 });
};

export const updateMedicationAdherence = async (userId, medId, date, status) => {
  if (!["taken", "skipped"].includes(status)) {
    throw new Error("Status must be 'taken' or 'skipped'");
  }

  const med = await MedSchedule.findOne({ _id: medId, userId });
  if (!med) throw new Error("Medication schedule not found");

  const targetDate = new Date(date).toDateString();
  if (new Date(date) < med.startDate || new Date(date) > med.endDate) {
    throw new Error("Date is outside of medication schedule");
  }

  const existingLogIndex = med.adherenceLog.findIndex(
    (log) => new Date(log.date).toDateString() === targetDate
  );

  if (existingLogIndex > -1) {
    med.adherenceLog[existingLogIndex].status = status;
  } else {
    med.adherenceLog.push({ date: new Date(date), status });
  }

  return await med.save();
};

export const deleteMedicationSchedule = async (userId, medId) => {
  const med = await MedSchedule.findOneAndDelete({ _id: medId, userId });
  if (!med) throw new Error("Medication schedule not found");
  return med;
};
