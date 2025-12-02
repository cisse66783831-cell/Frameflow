import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Helper to safely get environment variables
const getEnv = (key: string) => {
  // Try import.meta.env (Vite standard)
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env && meta.env[key]) {
    return meta.env[key];
  }
  // Try process.env (Fallback for some environments/builds)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Configuration Firebase using safe getter
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Check if config is present
const isConfigured = !!firebaseConfig.apiKey;

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (isConfigured && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("🔥 Firebase connecté avec succès");
  } catch (error) {
    console.error("Erreur d'initialisation Firebase:", error);
  }
} else if (!isConfigured) {
  console.warn("⚠️ Firebase non configuré. L'application tourne en mode DEMO (Mock). Créez un fichier .env avec vos clés Firebase.");
}

export { auth, db, storage, isConfigured };