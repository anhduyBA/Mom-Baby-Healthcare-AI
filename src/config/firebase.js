import admin from "firebase-admin";
import fs from "fs";

let firebaseInitialized = false;

try {
  const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH || "./firebase-service-account.json";
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
    });
    firebaseInitialized = true;
    console.log("[Firebase] Initialized successfully.");
  } else {
    console.warn("[Firebase Warning] Key file not found. Using local uploads folder fallback.");
  }
} catch (err) {
  console.error("[Firebase Error] Initialization failed:", err.message);
}

export { admin as default, firebaseInitialized };
