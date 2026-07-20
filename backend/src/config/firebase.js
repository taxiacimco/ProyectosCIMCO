// Versión Arquitectura: V4.7 - Fusión Atómica de Inicialización Asíncrona Fallback y Ajuste de Puertos del Emulador 8085
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\config\firebase.js
 * Misión: Configuración y acoplamiento táctico del Firebase Admin SDK con soporte híbrido para emuladores locales y producción.
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ==================================================================
// 📐 GOBERNANZA DE RUTAS TOPOLÓGICAS (FIRESTORE_PATHS)
// ==================================================================
export const RUTA_VIAJES_PROD = "artifacts/taxiacimco-app/public/data/viajes";

// Fusión atómica de colecciones: preservamos transacciones e incorporamos conductores_activos homologado
export const FIRESTORE_PATHS = {
    conductores: 'conductores_activos',
    viajes: 'viajes',
    transacciones: 'transacciones'
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
                // Soporte síncrono inicial para exportaciones atómicas inmediatas del módulo
                const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } catch (err) {
                // Fallback secundario asíncrono para preservar la compatibilidad con la versión V4.2 anterior
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