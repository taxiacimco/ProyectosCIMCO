// Versión Arquitectura: V4.8 - Inclusión del Helper de Auditoría Financiera y Extensión de Rutas Firestore
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\firebase.js
 * Misión: Configuración del Firebase Admin SDK con soporte híbrido (Emulador/Producción) y auditoría centralizada en Firestore.
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

// 🛡️ CONTROLADORES DE ENTORNO (ANTI-UNDEFINED)
const hostEmulador = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085";
const esEntornoDesarrollo = process.env.NODE_ENV === 'development' || process.env.FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
    if (esEntornoDesarrollo) {
        // 🚀 Alineación de variables en memoria para interceptar llamadas salientes de Firebase Admin SDK
        process.env.FIRESTORE_EMULATOR_HOST = hostEmulador;
        if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
            process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
        }

        console.log(`🔥 [CIMCO-CONFIG] Firebase Admin SDK conectado al Emulador Local en Puerto ${process.env.FIRESTORE_EMULATOR_HOST}`);
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.CIMCO_PROJECT_ID || 'pelagic-chalice-467818-e1'
        });
    } else {
        // 🔒 PRODUCCIÓN REAL: Consumo seguro por estrategia implícita o lectura de serviceAccountKey.json perimetral
        console.log("📡 [CIMCO-CONFIG] Inicializando Firebase Admin SDK con Credenciales de Producción...");
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || resolve(__dirname, '..', '..', 'serviceAccountKey.json');
        
        try {
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        } catch (e) {
            // Fallback directo cargando el JSON físico si el método implícito no encuentra la variable de entorno
            try {
                const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } catch (err) {
                readFile(serviceAccountPath, 'utf8')
                    .then((data) => {
                        const serviceAccountAsync = JSON.parse(data);
                        if (!admin.apps.length) {
                            admin.initializeApp({
                                credential: admin.credential.cert(serviceAccountAsync)
                            });
                        }
                    })
                    .catch((asyncErr) => {
                        console.error("🚨 [CIMCO-FIREBASE-ERROR] No se pudo inicializar Firebase Admin SDK:", asyncErr.message);
                    });
            }
        }
    }
}

// 📡 Instanciación e Inyección de la base de datos para soporte de doble firma de exportación
export const db = admin.firestore();
export const dbFirestore = db;

// ⚡ Configuración de red del cliente Firestore local para anular SSL hacia el emulador
if (esEntornoDesarrollo) {
    db.settings({
        host: hostEmulador,
        ssl: false
    });
}

/**
 * 💻 HELPER CENTRALIZADO PARA AUDITORÍA EN FIRESTORE
 * Registra movimientos de recargas, débitos y ajustes en la colección de transacciones.
 */
export const registrarTransaccionFirestore = async ({
    idUsuario,
    rol,
    subrol = 'N/A',
    monto,
    saldoAnterior,
    saldoNuevo,
    tipoOperacion, // 'RECARGA', 'DEBITO', 'AJUSTE'
    autorizadoPor,
    referencia
}) => {
    try {
        if (!dbFirestore) return;
        const coleccionTransacciones = FIRESTORE_PATHS?.transacciones || 'transacciones';

        await dbFirestore.collection(coleccionTransacciones).add({
            idUsuario: String(idUsuario),
            rol: String(rol).toLowerCase(),
            subrol: String(subrol).toLowerCase(),
            monto: Number(monto),
            saldoAnterior: Number(saldoAnterior),
            saldoNuevo: Number(saldoNuevo),
            tipoOperacion: String(tipoOperacion).toUpperCase(),
            autorizadoPor: String(autorizadoPor || 'SISTEMA'),
            referencia: referencia || `TRX-${Date.now()}`,
            timestamp: FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.warn("⚠️ [CIMCO-FIRESTORE-AUDIT-WARN] Error registrando auditoría de transacción:", error.message);
    }
};

export default {
    db,
    dbFirestore,
    FIRESTORE_PATHS,
    RUTA_VIAJES_PROD,
    registrarTransaccionFirestore
};