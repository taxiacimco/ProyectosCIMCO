// Versión Arquitectura: V1.5 - Aislamiento de Entorno, Bloqueo de Producción y Guardas Defensivas
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\simulador_gps.js
 * Misión: Transmitir telemetría GPS continua hacia Firestore simulando el movimiento físico solo en desarrollo.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth'; 
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolución de rutas estricta para ES Modules y variables de entorno locales[cite: 6]
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 🛡️ COMPUERTA PERIMETRAL: Validar si está permitido ejecutar simulaciones en el ecosistema
const ALLOW_SIMULATOR = process.env.ALLOW_GPS_SIMULATOR === 'true';
const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';

if (ENTORNO_ACTUAL === 'production') {
    console.error("\n🚨 [CIMCO-ANTIFRAUDE] Abortando: Las simulaciones GPS están ESTRICTAMENTE PROHIBIDAS en producción.");
    console.error("📡 La telemetría debe provenir exclusivamente de los dispositivos reales de los conductores.\n");
    process.exit(1);
}

if (!ALLOW_SIMULATOR) {
    console.warn("\n⚠️ [CIMCO-SEGURIDAD] Simulador GPS inactivo.");
    console.warn("💡 Para usarlo en desarrollo, define 'ALLOW_GPS_SIMULATOR=true' en tu archivo .env.\n");
    process.exit(0);
}

const firebaseConfig = {
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "547432247321",
    appId: "1:547432247321:web:531630ed4976c669176840"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 📍 FLOTA REAL DE LA JAGUA DE IBIRICO (Mapeo estricto de tus 4 roles)[cite: 6]
const unidadesSimuladas = [
    {
        id: "6a29c73cc8d7b14cd8f85876", // UID Pantera Rosa[cite: 6]
        conductor: "Pantera rosa", // cite: 6
        placa: "MOT123", // cite: 6
        numeroInterno: "#057", // cite: 6
        role: "mototaxi", // cite: 6
        status: "activo", // cite: 6
        coordenadas: [
            { lat: 9.56215, lng: -73.33418 }, // Terminal[cite: 6]
            { lat: 9.56280, lng: -73.33490 }, // cite: 6
            { lat: 9.56350, lng: -73.33560 }, // cite: 6
            { lat: 9.56420, lng: -73.33630 }, // cite: 6
            { lat: 9.56500, lng: -73.33700 } // cite: 6
        ]
    },
    {
        id: "6a29ca0bc8d7b14cd8f85879", // UID Juan[cite: 6]
        conductor: "Juan", // cite: 6
        placa: "PAR123", // cite: 6
        numeroInterno: "#056", // cite: 6
        role: "moto-parrillero", // cite: 6
        status: "activo", // cite: 6
        coordenadas: [
            { lat: 9.55390, lng: -73.35510 }, // Plaza Principal[cite: 6]
            { lat: 9.55440, lng: -73.35450 }, // cite: 6
            { lat: 9.55500, lng: -73.35380 }, // cite: 6
            { lat: 9.55560, lng: -73.35310 }, // cite: 6
            { lat: 9.55620, lng: -73.35240 } // cite: 6
        ]
    },
    {
        id: "6a29ca9bc8d7b14cd8f8587c", // UID Pedro[cite: 6]
        conductor: "Pedro", // cite: 6
        placa: "CAR123", // cite: 6
        numeroInterno: "#059", // cite: 6
        role: "motocarga", // cite: 6
        status: "activo", // cite: 6
        coordenadas: [
            { lat: 9.57010, lng: -73.34110 }, // Salida Norte[cite: 6]
            { lat: 9.56930, lng: -73.34180 }, // cite: 6
            { lat: 9.56850, lng: -73.34250 }, // cite: 6
            { lat: 9.56770, lng: -73.34320 }, // cite: 6
            { lat: 9.56690, lng: -73.34390 } // cite: 6
        ]
    }
];

async function iniciarSimulacion() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-TELEMETRÍA] Activando Radar de Flota en La Jagua"); // cite: 6
    console.log("🔒 Solicitando token de escritura satelital..."); // cite: 6
    console.log("==================================================================");

    try {
        await signInAnonymously(auth); // cite: 6
        console.log("✅ [CANAL ABIERTO] Autenticación perimetral concedida.\n"); // cite: 6
    } catch (authError) {
        console.error("🚨 [BLINDADO] Firebase rechazó la conexión anónima:", authError.message); // cite: 6
        process.exit(1);
    }

    let paso = 0; // cite: 6
    const totalPasos = 5; // cite: 6

    const intervalo = setInterval(async () => { // cite: 6
        if (paso >= totalPasos) { // cite: 6
            console.log("\n🏁 [CICLO TERMINADO] Purgando telemetría transitoria del mapa..."); // cite: 6
            clearInterval(intervalo); // cite: 6
            
            for (const unidad of unidadesSimuladas) { // cite: 6
                try {
                    await deleteDoc(doc(db, "conductores_activos", unidad.id)); // cite: 6
                } catch (e) { /* Omisión silenciosa en purga */ }
            }
            console.log("✅ Radar despejado. Fin del test."); // cite: 6
            process.exit(0);
        }

        console.log(`📡 [PULSO GPS #${paso + 1}] Georreferenciando unidades en La Jagua...`); // cite: 6

        const promesas = unidadesSimuladas.map(async (u) => { // cite: 6
            const pos = u.coordenadas[paso]; // cite: 6
            const ref = doc(db, "conductores_activos", u.id); // cite: 6

            const payload = {
                uid: u.id, // cite: 6
                nombre: u.conductor, // cite: 6
                placa: u.placa, // cite: 6
                numeroInterno: u.numeroInterno, // cite: 6
                role: u.role, // cite: 6
                ubicacion: {
                    lat: pos.lat, // cite: 6
                    lng: pos.lng // cite: 6
                },
                updatedAt: new Date().toISOString() // cite: 6
            };

            try {
                await setDoc(ref, payload, { merge: true }); // cite: 6
                console.log(`  🛺 [${u.placa} - ${u.conductor}] -> Lat: ${pos.lat} | OK`); // cite: 6
            } catch (err) {
                console.error(`  🚨 Fallo en ${u.conductor}:`, err.message); // cite: 6
            }
        });

        await Promise.all(promesas); // cite: 6
        paso++; // cite: 6
    }, 3000);  // cite: 6
}

iniciarSimulacion();