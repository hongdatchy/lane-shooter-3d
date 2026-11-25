import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || "",
};

// Kiểm tra đã điền cấu hình Firebase thật trong .env chưa (giống cơ chế isFirebaseReady ở thai_huong)
export function isFirebaseReady(): boolean {
  return (
    Boolean(firebaseConfig.apiKey) &&
    Boolean(firebaseConfig.projectId) &&
    !firebaseConfig.apiKey.startsWith("mock-") &&
    !firebaseConfig.apiKey.startsWith("your-") &&
    !firebaseConfig.projectId.startsWith("your-")
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseReady()) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export function getFirebaseAppOrThrow(): FirebaseApp {
  if (!isFirebaseReady() || !app) {
    throw new Error(
      "Firebase is not configured. Please check NEXT_PUBLIC_FIREBASE_* environment variables."
    );
  }
  return app;
}

export function getFirebaseDbOrThrow(): Firestore {
  if (!isFirebaseReady() || !db) {
    throw new Error(
      "Firebase Firestore is not configured. Please check NEXT_PUBLIC_FIREBASE_* environment variables."
    );
  }
  return db;
}

export { app, db };
export default app;
