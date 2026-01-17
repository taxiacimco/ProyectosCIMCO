import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join } from 'path';

let app;

if (!getApps().length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccount.json';
    const absolutePath = join(process.cwd(), serviceAccountPath);
    const serviceAccount = JSON.parse(readFileSync(absolutePath, 'utf8'));

    app = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("✅ [CIMCO] Firebase Admin inicializado con Service Account.");
  } catch (error) {
    app = initializeApp();
    console.log("⚠️ [CIMCO] Firebase Admin inicializado en modo Emulador.");
  }
}

export const db = getFirestore();
export const auth = getAuth();
export default app;