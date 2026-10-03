import { initializeApp, getApps, getApp } from 'firebase/app';
// getAuth removed
import { getDatabase } from 'firebase/database';

// ⚠️ PENTING: Ganti nilai-nilai di bawah ini dengan Firebase Config milik Anda!
// Anda bisa mendapatkannya di Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: "AIzaSyBJfDvuM3gD35pU5ELF4vwH5smkhpdb8Vg",
  authDomain: "bettacare-bb2276.firebaseapp.com",
  projectId: "bettacare-bb2276",
  storageBucket: "bettacare-bb2276.firebasestorage.app",
  messagingSenderId: "334935451177",
  appId: "1:334935451177:web:29cd9295263d59c7a5de38",
  measurementId: "G-SJRRW1H3CD",
  databaseURL: "https://bettacare-bb2276-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase only if it hasn't been initialized yet
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

import { initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error: any) {
  if (error.code === 'auth/already-initialized') {
    // @ts-ignore
    const { getAuth } = require('firebase/auth');
    authInstance = getAuth(app);
  } else {
    throw error;
  }
}
export const auth = authInstance;

export const db = getDatabase(app);
export const isFirebaseConfigured = firebaseConfig.apiKey !== "SIMULATION_API_KEY";
