import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

export let db: any = null;
export let auth: any = null;
export let googleProvider: any = null;
export let isFirebasePlaceholder = true;

const isPlaceholderConfig = 
  !firebaseConfig ||
  !firebaseConfig.projectId ||
  firebaseConfig.projectId.includes("remixed-project-id") ||
  firebaseConfig.projectId === "remixed-project-id" ||
  firebaseConfig.apiKey === "remixed-api-key";

if (!isPlaceholderConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || "default");
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    isFirebasePlaceholder = false;
    console.log("Firebase initialized successfully with real credentials!");
  } catch (error) {
    console.error("Failed to initialize real Firebase:", error);
    db = null;
    auth = null;
    googleProvider = null;
    isFirebasePlaceholder = true;
  }
} else {
  console.log("Running in offline mode (Firebase config is placeholder/remixed).");
}

