// functions/src/config/firebase.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Cargar la cuenta de servicio de forma segura para entorno local
// Nota: Este archivo lo excluimos de Git anteriormente por seguridad
const serviceAccountPath = join(__dirname, '../../service-account/admin-sa.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// 2. Inicializar la App
initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1'
});

// 3. Instancias de servicios
const db = getFirestore();
const auth = getAuth();

// Configuración para Emuladores (si detecta el entorno de desarrollo)
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    db.settings({
        host: 'localhost:8080',
        ssl: false
    });
    console.log("🚀 Conectado al Emulador de Firestore");
}

export { db, auth, FieldValue };