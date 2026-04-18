import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function init() {
  if (getApps().length) return getApps()[0];
  return initializeApp(firebaseConfig);
}

export function getFirebase() {
  const app = init();
  const db = getFirestore(app);
  const isBrowser = typeof window !== 'undefined';

  return {
    app,
    db,
    auth: isBrowser ? getAuth(app) : null,
    storage: isBrowser ? getStorage(app) : null,
  };
}
