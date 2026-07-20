// Versión Arquitectura: V22.1 - Bloqueo de Perímetro de Producción y Carga Dinámica de Puertos
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\stress_test.js

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolución y carga del entorno local para evaluar el NODE_ENV antes de cualquier disparo HTTP
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// 🛡️ COMPUERTA PERIMETRAL: Detener el script si se intenta correr apuntando a producción
if (ENTORNO_ACTUAL === 'production') {
    console.error("\n🚨 [CIMCO-ANTIFRAUDE] Abortando stress_test.js: Prohibido lanzar pruebas de carga en producción.");
    console.error("🔒 Los endpoints de bypass y los tokens mock están deshabilitados globalmente.\n");
    process.exit(1);
}

const BASE_URL_VIAJES = `http://localhost:${PORT}/api/viajes`;
const BASE_URL_CONDUCTORES = `http://localhost:${PORT}/api/conductores`; 
const TOTAL_CONCURRENTE = 10; 

let ID_CONDUCTOR_REAL = "6a29c73cc8d7b14cd8f85876"; 
const ID_PASAJERO_BASE = "6a29b491c8d7b14cd8f85871";

const LOCAL_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2YTI5YjQ5MWM4ZDdiMTRjZDhmODU4NzEiLCJub21icreOiJDYXJsb3MgTWFyaW8gRnVlbnRlcyIsImVtYWlsIjoiY2FybG9zbWFyaW9mdWVudGVzZ2FyY2lhQGdtYWlsLmNvbSIsInJvbGUiOiJwYXNhamVybyIsImVzdGFkbyI6ImFjdGl2byIsImlhdCI6MTg4MjUzNzYwMH0.CIMCO_SIGNATURE_MOCK_SECRET_FOR_LOCAL_STRESS_TESTING_V9";

const CABECERAS_BYPASS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LOCAL_JWT_TOKEN}`,
    'User-Agent': 'StressTestAgent',      
    'x-stress-test': 'true'
};

async function recargarBilleteraBypass() {
    console.log(`💳 [PRE-FLIGHT] Forzando inyección de $150,000 COP al ID: ${ID_CONDUCTOR_REAL}...`);
    try {
        const res = await fetch(`${BASE_URL_CONDUCTORES}/bypass-stress-saldo`, {
            method: 'PUT',
            headers: CABECERAS_BYPASS,
            body: JSON.stringify({
                conductorId: ID_CONDUCTOR_REAL,
                saldo: 150000
            })
        });
        const data = await res.json();
        if (data && data.success) {
            console.log(`✅ [PRE-FLIGHT] Saldo inyectado con éxito en Atlas. Saldo actual: $${data.data.saldo} COP.`);
            return true;
        }
        console.warn("⚠️ [PRE-FLIGHT] El endpoint de bypass no respondió éxito. Intenta recargar el ID desde Compass.");
        return false;
    } catch (e) {
        console.error("❌ [PRE-FLIGHT] Error conectando al endpoint de bypass:", e.message);
        return false;
    }
}

async function simularCicloViajeConcurrente(idHijo) {
    const payloadSolicitud = {
        pasajeroId: ID_PASAJERO_BASE,
        origen: { lat: 9.56215, lng: -73.33418, direccion: `Terminal La Jagua Hilo-${idHijo}` },
        destino: { lat: 9.56800, lng: -73.33900, direccion: `Barrio Central Hilo-${idHijo}` },
        origenTexto: `Terminal La Jagua Hilo-${idHijo}`,   
        destinoTexto: `Barrio Central Hilo-${idHijo}`,  
        tarifa: 5000,
        metodoPago: 'EFECTIVO',
        tipoServicio: 'mototaxi'
    };

    try {
        const resSolicitud = await fetch(`${BASE_URL_VIAJES}/solicitar`, {
            method: 'POST',
            headers: CABECERAS_BYPASS,
            body: JSON.stringify(payloadSolicitud)
        });

        const dataSolicitud = await resSolicitud.json();
        if (!dataSolicitud || !dataSolicitud.success || !dataSolicitud.viajeId) return;

        const idViajeCreado = dataSolicitud.viajeId;
        console.log(`✅ [HILO-${idHijo}] Viaje Solicitado Exitosamente. ID: ${idViajeCreado}`);

        const resAceptar = await fetch(`${BASE_URL_VIAJES}/aceptar`, {
            method: 'POST',
            headers: CABECERAS_BYPASS,
            body: JSON.stringify({ viajeId: idViajeCreado, conductorId: ID_CONDUCTOR_REAL })
        });

        const dataAceptar = await resAceptar.json();
        if (dataAceptar && dataAceptar.success) {
            console.log(`  🏍️ -> [HILO-${idHijo}] Asignación Atómica Exitosa y Sincronizada en La Jagua.`);
        } else {
            console.warn(`  ⚠️ -> [HILO-${idHijo}] Rechazado:`, dataAceptar?.message);
        }
    } catch (error) {
        console.error(`❌ [HILO-${idHijo}] Error HTTP:`, error.message);
    }
}

async function ejecutarStressTestConcurrente() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-STRESS HTTP] Sincronizando Ataque Masivo Paralelo...");
    console.log("==================================================================");

    // Ejecutamos la recarga forzada pre-vuelo
    await recargarBilleteraBypass();

    console.log("🔥 Ejecutando ráfaga síncrona paralela...");
    const startTime = Date.now();
    const promesas = [];

    for (let i = 0; i < TOTAL_CONCURRENTE; i++) {
        promesas.push(simularCicloViajeConcurrente(i));
    }

    await Promise.all(promesas);
    console.log("==================================================================");
    console.log(`🏁 [STRESS TERMINADO] Malla procesada en: ${Date.now() - startTime}ms`);
    console.log("==================================================================");
}

ejecutarStressTestConcurrente();