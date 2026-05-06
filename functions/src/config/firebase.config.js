import { ENV } from "./env/index.js";

export const clientConfig = {
  apiKey: ENV.FIREBASE.WEB_API_KEY || "",
  projectId: ENV.PROJECT_ID, // Ya viene validado y sin fallos de "overlap"

  authDomain: `${ENV.PROJECT_ID}.firebaseapp.com`,
  storageBucket: `${ENV.PROJECT_ID}.firebasestorage.app`,

  messagingSenderId: ENV.FIREBASE.MESSAGING_SENDER_ID || "",
  appId: ENV.FIREBASE.APP_ID || "",
  measurementId: ENV.FIREBASE.MEASUREMENT_ID || "",
};