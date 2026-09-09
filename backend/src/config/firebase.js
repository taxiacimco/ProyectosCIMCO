// Versión Arquitectura: V5.0 - Desactivación Forzada de Emulador Local para Conexión Directa a Firebase Cloud
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\firebase.js
 * Misión: Configuración del Firebase Admin SDK apuntando a /config/serviceAccountKey.json,
 *         conexión directa a la nube real de Firebase Cloud y auditoría centralizada en Firestore.
 */

import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================================================================
// 📐 GOBERNANZA DE RUTAS TOPOLÓGICAS (FIRESTORE_PATHS)
// ==================================================================
export const RUTA_VIAJES_PROD = "artifacts/taxiacimco-app/public/data/viajes";

export const FIRESTORE_PATHS = {
    conductores: 'conductores_activos',
    viajes: 'viajes',
    transacciones: 'transacciones',
    users: 'usuarios',
    wallets: 'billeteras'
};

// 🛡️ CONTROLADORES DE ENTORNO (ANTI-UNDEFINED Y FORZADO A CLOUD REAL)
// Se deshabilitan las anulaciones por emulador local para garantizar la persistencia en Firebase Cloud Real
// process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
// process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:8085";

if (!admin.apps.length) {
    console.log("📡 [CIMCO-CONFIG] Inicializando Firebase Admin SDK con Credenciales de Producción Cloud...");
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(__dirname, '..', '..', 'config', 'serviceAccountKey.json');
    
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1'
        });
    } catch (e) {
        // Fallback directo cargando el JSON físico desde backend/config/serviceAccountKey.json
        try {
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID || process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1'
            });
        } catch (err) {
            readFile(serviceAccountPath, 'utf8')
                .then((data) => {
                    const serviceAccountAsync = JSON.parse(data);
                    if (!admin.apps.length) {
                        admin.initializeApp({
                            credential: admin.credential.cert(serviceAccountAsync),
                            projectId: process.env.FIREBASE_PROJECT_ID || process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1'
                        });
                    }
                })
                .catch((asyncErr) => {
                    console.error("🚨 [CIMCO-FIREBASE-ERROR] No se pudo inicializar Firebase Admin SDK:", asyncErr?.message || asyncErr);
                });
        }
    }
}

// 📡 Instanciación e Inyección de la base de datos para soporte de doble firma de exportación
export const db = admin.firestore();
export const dbFirestore = db;

/**
 * 💻 HELPER CENTRALIZADO PARA AUDITORÍA EN FIRESTORE
 */
export const registrarTransaccionFirestore = async ({
    idUsuario,
    rol,
    subrol = 'N/A',
    monto,
    saldoAnterior,
    saldoNuevo,
    tipoOperacion,
    autorizadoPor,
    referencia
}) => {
    try {
        if (!dbFirestore) return;
        const coleccionTransacciones = FIRESTORE_PATHS?.transacciones || 'transacciones';

        await dbFirestore.collection(coleccionTransacciones).add({
            idUsuario: String(idUsuario || ''),
            rol: String(rol || '').toLowerCase(),
            subrol: String(subrol || 'N/A').toLowerCase(),
            monto: Number(monto || 0),
            saldoAnterior: Number(saldoAnterior || 0),
            saldoNuevo: Number(saldoNuevo || 0),
            tipoOperacion: String(tipoOperacion || 'DESCONOCIDO').toUpperCase(),
            autorizadoPor: String(autorizadoPor || 'SISTEMA'),
            referencia: referencia || `TRX-${Date.now()}`,
            timestamp: FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.warn("⚠️ [CIMCO-FIRESTORE-AUDIT-WARN] Error registrando auditoría de transacción:", error?.message || error);
    }
};

export default {
    db,
    dbFirestore,
    FIRESTORE_PATHS,
    RUTA_VIAJES_PROD,
    registrarTransaccionFirestore
};