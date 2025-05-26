// src/lib/firebase/config.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };

// IMPORTANT:
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Enable Google Sign-In in Firebase Authentication > Sign-in method.
// 3. Get your Firebase config from Project settings > General > Your apps > Web app.
// 4. Create a .env.local file in the root of your project and add your Firebase credentials:
//    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
//    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
//    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
//    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
//    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
//    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
//
// Ensure your .env.local file is added to .gitignore to keep credentials secure.
