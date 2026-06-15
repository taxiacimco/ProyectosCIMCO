// Versión Arquitectura: V1.3 - Simulador Geoespacial Definitivo (Autocontenido y Blindado)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\simulador_gps.js
 * Misión: Inyectar ráfagas GPS directas pasando la aduana perimetral de Firebase de forma aislada.
 * Integridad: Llaves de producción inyectadas estáticamente para evitar fallos de lectura dotenv.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth'; 

// 🛡️ CONFIGURACIÓN ESTÁTICA DEFINITIVA (Extraída directamente de tu Maestro de Entorno V12.1)
const firebaseConfig = {
    apiKey: "AIzaSyCseKkOoHY8pbSnUWSEWyPR8et1BVccr7s",
    authDomain: "pelagic-chalice-467818-e1.firebaseapp.com",
    projectId: "pelagic-chalice-467818-e1",
    storageBucket: "pelagic-chalice-467818-e1.firebasestorage.app",
    messagingSenderId: "547432247321",
    appId: "1:547432247321:web:531630ed4976c669176840"
};

// Inicialización de la instancia de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 📍 MATRIZ DE RUTAS GEOGRÁFICAS (Casco urbano de La Jagua de Ibirico)
const unidadesSimuladas = [
    {
        id: "MOTO_TACTICA_01",
        conductor: "Alfonso Mendoza",
        status: "en ruta",
        tarifa: 5000,
        coordenadas: [
            { lat: 9.56215, lng: -73.33418 }, // Terminal de Transportes
            { lat: 9.56310, lng: -73.33510 },
            { lat: 9.56420, lng: -73.33600 },
            { lat: 9.56530, lng: -73.33710 },
            { lat: 9.56640, lng: -73.33820 }, // Fin trayecto
        ]
    },
    {
        id: "MOTO_TACTICA_02",
        conductor: "Jairo Gutiérrez",
        status: "buscando pasajero",
        tarifa: 4000,
        coordenadas: [
            { lat: 9.55390, lng: -73.35510 }, // Plaza Principal
            { lat: 9.55450, lng: -73.35400 },
            { lat: 9.55520, lng: -73.35310 },
            { lat: 9.55600, lng: -73.35200 },
            { lat: 9.55710, lng: -73.35100 }, // Fin trayecto
        ]
    },
    {
        id: "MOTO_TACTICA_03",
        conductor: "Luis Carlos Vega",
        status: "en ruta",
        tarifa: 6000,
        coordenadas: [
            { lat: 9.57010, lng: -73.34110 }, // Entrada Norte
            { lat: 9.56910, lng: -73.34210 },
            { lat: 9.56800, lng: -73.34320 },
            { lat: 9.56700, lng: -73.34410 },
            { lat: 9.56610, lng: -73.34500 }, // Fin trayecto
        ]
    }
];

async function iniciarSimulacion() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-RADAR] Iniciando Generador de Ráfagas GPS Concurrentes");
    console.log("📍 Cobertura Táctica: La Jagua de Ibirico, Cesar");
    console.log("🔒 Autenticando canal mediante Handshake Anónimo Seguro...");
    console.log("==================================================================");

    try {
        // 🔐 CANAL ANÓNIMO: Obtiene un UID válido instantáneamente
        // Cumple la directiva de seguridad de tus Reglas V15.0 para escribir en 'viajes'
        await signInAnonymously(auth);
        console.log("✅ [HANDSHAKE OK] Canal autenticado y autorizado por Firebase.\n");
    } catch (authError) {
        console.error("🚨 [FALLO CRÍTICO] La autenticación fue rechazada por Google:");
        console.error(`Detalle: ${authError.message}`);
        process.exit(1);
    }

    let paso = 0;
    const totalPasos = 5;

    const intervalo = setInterval(async () => {
        if (paso >= totalPasos) {
            console.log("\n🏁 [SIMULACIÓN COMPLETADA] Limpiando nodos de telemetría de prueba...");
            clearInterval(intervalo);
            
            for (const unidad of unidadesSimuladas) {
                try {
                    await deleteDoc(doc(db, "viajes", unidad.id));
                    console.log(`🗑️ Removida de Firestore: ${unidad.id}`);
                } catch (err) {
                    console.error(`No se pudo remover ${unidad.id}:`, err.message);
                }
            }
            console.log("✅ Servidor táctico limpio. Saliendo.");
            process.exit(0);
        }

        console.log(`\n📡 [RÁFAGA GPS #${paso + 1}] Transmitiendo coordenadas...`);

        const promesasDeActualizacion = unidadesSimuladas.map(async (unidad) => {
            const posicionActual = unidad.coordenadas[paso];
            const viajeRef = doc(db, "viajes", unidad.id);

            const payloadGPS = {
                conductor: unidad.conductor,
                status: unidad.status,
                tarifa: unidad.tarifa,
                latitud: posicionActual.lat,
                longitud: posicionActual.lng,
                timestamp: new Date().toISOString()
            };

            try {
                await setDoc(viajeRef, payloadGPS, { merge: true });
                console.log(`  🏍️  [${unidad.id}] -> Lat: ${posicionActual.lat}, Lng: ${posicionActual.lng} | OK`);
            } catch (error) {
                console.error(`  🚨 [ERROR EN ${unidad.id}]:`, error.message);
            }
        });

        await Promise.all(promesasDeActualizacion);
        paso++;
    }, 3000); // Ráfaga cada 3 segundos para observar el movimiento fluido
}

iniciarSimulacion();