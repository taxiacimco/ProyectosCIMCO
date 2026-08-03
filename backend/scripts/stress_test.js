// Versión Arquitectura: V22.1 - Bloqueo de Perímetro de Producción y Carga Dinámica de Puertos
/**
 * Ubicación: backend/scripts/stress_test.js
 * Misión: Simulación paralela HTTP de solicitudes y asignación concurrente de servicios.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

if (ENTORNO_ACTUAL === 'production') {
    console.error("\n🚨 [CIMCO-ANTIFRAUDE] Abortando: Prohibido lanzar pruebas de carga en producción.");
    process.exit(1);
}

const BASE_URL_VIAJES = `http://localhost:${PORT}/api/viajes`;
const BASE_URL_CONDUCTORES = `http://localhost:${PORT}/api/conductores`; 
const TOTAL_CONCURRENTE = 10; 

const ID_CONDUCTOR_REAL = "6a29c73cc8d7b14cd8f85876"; 
const ID_PASAJERO_BASE = "6a29b491c8d7b14cd8f85871";

const LOCAL_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2YTI5YjQ5MWM4ZDdiMTRjZDhmODU4NzEiLCJub21icreOiJDYXJsb3MgTWFyaW8gRnVlbnRlcyIsImVtYWlsIjoiY2FybG9zbWFyaW9mdWVudGVzZ2FyY2lhQGdtYWlsLmNvbSIsInJvbGUiOiJwYXNhamVybyIsImVzdGFkbyI6ImFjdGl2byIsImlhdCI6MTg4MjUzNzYwMH0.CIMCO_SIGNATURE_MOCK_SECRET_FOR_LOCAL_STRESS_TESTING_V9";

const CABECERAS_BYPASS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LOCAL_JWT_TOKEN}`,
    'User-Agent': 'StressTestAgent',      
    'x-stress-test': 'true'
};

async function recargarBilleteraBypass() {
    console.log(`💳 [PRE-FLIGHT] Inyectando saldo de prueba al conductor ID: ${ID_CONDUCTOR_REAL}...`);
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
            console.log(`✅ [PRE-FLIGHT] Saldo inyectado con éxito. Saldo actual: $${data.data.saldo} COP.`);
            return true;
        }
        console.warn("⚠️ [PRE-FLIGHT] El endpoint de bypass no confirmó la inyección.");
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
            console.log(`  🏍️ -> [HILO-${idHijo}] Asignación Exitosa.`);
        } else {
            console.warn(`  ⚠️ -> [HILO-${idHijo}] Rechazado:`, dataAceptar?.message);
        }
    } catch (error) {
        console.error(`❌ [HILO-${idHijo}] Error HTTP:`, error.message);
    }
}

async function ejecutarStressTestConcurrente() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-STRESS HTTP] Ejecutando solicitudes en paralelo...");
    console.log("==================================================================");

    await recargarBilleteraBypass();

    const startTime = Date.now();
    const promesas = Array.from({ length: TOTAL_CONCURRENTE }, (_, i) => simularCicloViajeConcurrente(i));

    await Promise.all(promesas);
    console.log("==================================================================");
    console.log(`🏁 [STRESS TERMINADO] Procesado en: ${Date.now() - startTime}ms`);
    console.log("==================================================================");
}

ejecutarStressTestConcurrente();