
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // Added

// TODO: Add your own Firebase SDK Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCNEklORNvPRUdAKHGdD4o7gPM8uQoeJqA",
  authDomain: "sharesync-79.firebaseapp.com",
  projectId: "sharesync-79",
  storageBucket: "sharesync-79.appspot.com", // Corrected to .appspot.com for storage
  messagingSenderId: "671455925326",
  appId: "1:671455925326:web:3fa80f2bad88a6eb3f1f1f",
  measurementId: "G-C9PVNR9EZZ"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Added

export { db, auth, app, storage }; // Added storage
