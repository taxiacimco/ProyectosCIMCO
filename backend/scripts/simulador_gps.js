// Versión Arquitectura: V1.5 - Aislamiento de Entorno, Bloqueo de Producción y Guardas Defensivas
/**
 * Ubicación: backend/scripts/simulador_gps.js
 * Misión: Transmitir telemetría GPS continua hacia Firestore simulando el movimiento físico solo en desarrollo.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth'; 
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ALLOW_SIMULATOR = process.env.ALLOW_GPS_SIMULATOR === 'true';
const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';

if (ENTORNO_ACTUAL === 'production') {
    console.error("\n🚨 [CIMCO-ANTIFRAUDE] Abortando: Simulaciones GPS prohibidas en producción.");
    process.exit(1);
}

if (!ALLOW_SIMULATOR) {
    console.warn("\n⚠️ [CIMCO-SEGURIDAD] Simulador GPS inactivo.");
    console.warn("💡 Para usarlo en desarrollo, define 'ALLOW_GPS_SIMULATOR=true' en tu archivo .env.\n");
    process.exit(0);
}

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "pelagic-chalice-467818-e1",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "547432247321",
    appId: process.env.FIREBASE_APP_ID || "1:547432247321:web:531630ed4976c669176840"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const unidadesSimuladas = [
    {
        id: "6a29c73cc8d7b14cd8f85876",
        conductor: "Pantera rosa",
        placa: "MOT123",
        numeroInterno: "#057",
        role: "mototaxi",
        status: "activo",
        coordenadas: [
            { lat: 9.56215, lng: -73.33418 },
            { lat: 9.56280, lng: -73.33490 },
            { lat: 9.56350, lng: -73.33560 },
            { lat: 9.56420, lng: -73.33630 },
            { lat: 9.56500, lng: -73.33700 }
        ]
    },
    {
        id: "6a29ca0bc8d7b14cd8f85879",
        conductor: "Juan",
        placa: "PAR123",
        numeroInterno: "#056",
        role: "moto-parrillero",
        status: "activo",
        coordenadas: [
            { lat: 9.55390, lng: -73.35510 },
            { lat: 9.55440, lng: -73.35450 },
            { lat: 9.55500, lng: -73.35380 },
            { lat: 9.55560, lng: -73.35310 },
            { lat: 9.55620, lng: -73.35240 }
        ]
    },
    {
        id: "6a29ca9bc8d7b14cd8f8587c",
        conductor: "Pedro",
        placa: "CAR123",
        numeroInterno: "#059",
        role: "motocarga",
        status: "activo",
        coordenadas: [
            { lat: 9.57010, lng: -73.34110 },
            { lat: 9.56930, lng: -73.34180 },
            { lat: 9.56850, lng: -73.34250 },
            { lat: 9.56770, lng: -73.34320 },
            { lat: 9.56690, lng: -73.34390 }
        ]
    }
];

async function iniciarSimulacion() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-TELEMETRÍA] Activando Radar de Flota en La Jagua");
    console.log("==================================================================");

    try {
        await signInAnonymously(auth);
        console.log("✅ [CANAL ABIERTO] Autenticación perimetral concedida.\n");
    } catch (authError) {
        console.error("🚨 [BLINDADO] Firebase rechazó la conexión anónima:", authError.message);
        process.exit(1);
    }

    let paso = 0;
    const totalPasos = 5;

    const intervalo = setInterval(async () => {
        if (paso >= totalPasos) {
            console.log("\n🏁 [CICLO TERMINADO] Purgando telemetría del mapa...");
            clearInterval(intervalo);
            
            for (const unidad of unidadesSimuladas) {
                try {
                    await deleteDoc(doc(db, "conductores_activos", unidad.id));
                } catch (e) {}
            }
            console.log("✅ Radar despejado.");
            process.exit(0);
        }

        console.log(`📡 [PULSO GPS #${paso + 1}] Georreferenciando unidades...`);

        const promesas = unidadesSimuladas.map(async (u) => {
            const pos = u.coordenadas[paso];
            const ref = doc(db, "conductores_activos", u.id);

            const payload = {
                uid: u.id,
                nombre: u.conductor,
                placa: u.placa,
                numeroInterno: u.numeroInterno,
                role: u.role,
                ubicacion: {
                    lat: pos.lat,
                    lng: pos.lng
                },
                updatedAt: new Date().toISOString()
            };

            try {
                await setDoc(ref, payload, { merge: true });
                console.log(`  🛺 [${u.placa} - ${u.conductor}] -> Lat: ${pos.lat} | OK`);
            } catch (err) {
                console.error(`  🚨 Fallo en ${u.conductor}:`, err.message);
            }
        });

        await Promise.all(promesas);
        paso++;
    }, 3000);
}

iniciarSimulacion();