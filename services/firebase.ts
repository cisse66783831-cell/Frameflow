import * as firebaseApp from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// On n'importe plus le storage car on utilise le mode Base64 gratuit
// import { getStorage } from "firebase/storage"; 

// Workaround for TypeScript errors where it fails to find exported members in firebase/app
// This typically happens due to type definition mismatches in certain environments
const { initializeApp, getApps } = firebaseApp as any;

// Configuration Firebase EN DUR (Plus besoin de fichier .env)
const firebaseConfig = {
  apiKey: "AIzaSyAZS-CSUly5-qqqlkklYURGSnm5hKOg2J4",
  authDomain: "frameflow-45b60.firebaseapp.com",
  projectId: "frameflow-45b60",
  storageBucket: "frameflow-45b60.firebasestorage.app",
  messagingSenderId: "609414537478",
  appId: "1:609414537478:web:2cefeb7828e0263762fe87",
  measurementId: "G-ZRXEBVWNPY"
};

// Check if config is present (toujours vrai maintenant)
const isConfigured = true;

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;
let googleProvider: GoogleAuthProvider | null = null;

if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    // Initialisation du fournisseur Google
    googleProvider = new GoogleAuthProvider();
    
    // storage = getStorage(app); // Désactivé pour le mode gratuit
    console.log("🔥 Firebase connecté avec succès (Mode Clés Intégrées)");
  } catch (error) {
    console.error("Erreur d'initialisation Firebase:", error);
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export { auth, db, storage, googleProvider, isConfigured };