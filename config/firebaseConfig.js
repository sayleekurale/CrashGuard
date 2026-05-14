// config/firebaseConfig.js
// Connects CrashGuard to your Firebase project
// REPLACE all YOUR_xxx values with your actual Firebase config keys

import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Your Firebase project config ──────────────────────────────
// Get from: Firebase Console → Project Settings → Your Apps → Web app
export const firebaseConfig = {
  apiKey:            "AIzaSyDF7nvx85qaewkbiSLqNyfQVhSC-RSvWpk",
  authDomain:        "crashguard-538bb.firebaseapp.com",
  projectId:         "crashguard-538bb",
  storageBucket:     "crashguard-538bb.firebasestorage.app",
  messagingSenderId: "1968258894",
  appId:             "1:1968258894:web:c439194b8677da3c88e81f",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// auth — handles login/logout/register
// getReactNativePersistence = user stays logged in after closing app
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// db — your Firestore real-time database
export const db = getFirestore(app);