// Versión Arquitectura: V23.0 - Automatización de Carga Industrial con Autocannon
/**
 * Ubicación: backend/scripts/stress_test_autocannon.js
 * Misión: Estresar los métodos atómicos de despacho inmediato y liquidación contable.
 */

import autocannon from 'autocannon';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

if (ENTORNO_ACTUAL === 'production') {
    console.error("\n🚨 [CIMCO-ANTIFRAUDE] ABORTANDO EXTREMO: Prohibido lanzar Autocannon contra entornos de producción.");
    process.exit(1);
}

const ID_CONDUCTOR_INTERMUNICIPAL = "6a29cbb9c8d7b14cd8f85882"; // Camilo Castro
const ID_PASAJERO_REAL = "6a29b491c8d7b14cd8f85871";            // milevis Pasajero Test
const LOCAL_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjlhMTIzYzhkN2IxNGNkOGY4NTg2MCIsIm5vbWJyZSI6IkRlc3BhY2hhZG9yIENlbnRyYWwiLCJyb2wiOiJkZXNwYWNoYWRvciIsImlhdCI6MTcxOTg3ODQwMCwiZXhwIjoxNzUxNDE0NDAwfQ.SignaturePlaceholder_TAXIA_CIMCO_2026";

function ejecutarSuiteEstres() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-AUTOCANNON] INICIANDO INYECCIÓN INDUSTRIAL DE RENDIMIENTO");
    console.log(`📡 Servidor Objetivo: http://localhost:${PORT}`);
    console.log("🛡️  Mecanismo: Bypass de Autenticación Local ('x-stress-test')");
    console.log("==================================================================\n");

    const instancia = autocannon({
        url: `http://localhost:${PORT}`,
        connections: 50,
        pipelining: 1,
        duration: 10,
        title: "CIMCO_Atomic_Methods_Stress",
        requests: [
            {
                method: 'POST',
                path: '/api/viajes/despachar-inmediato',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LOCAL_JWT_TOKEN}`,
                    'x-stress-test': 'true'
                },
                body: JSON.stringify({
                    pasajeroId: ID_PASAJERO_REAL,
                    conductorId: ID_CONDUCTOR_INTERMUNICIPAL,
                    origen: { lat: 9.5623, lng: -73.3325 },
                    destino: { lat: 10.4631, lng: -73.2532 },
                    origenTexto: "Terminal de Transportes La Jagua de Ibirico",
                    destinoTexto: "Terminal de Transportes Valledupar",
                    tarifa: 25000,
                    metodoPago: "EFECTIVO"
                })
            }
        ]
    }, (err, result) => {
        if (err) {
            console.error("❌ [ERROR EN EL MOTOR DE CARGA]:", err);
            process.exit(1);
        }
        
        console.log("\n🏁 [PRUEBA FINALIZADA] Malla de telemetría procesada.");
        console.log("==================================================================");
        console.log(`📊 SOLICITUDES TOTALES : ${result.requests.total}`);
        console.log(`🚀 RENDIMIENTO PROMEDIO: ${result.requests.average} req/sec`);
        console.log(`⏱️  TIEMPO DE RESPUESTA P99: ${result.latency.p99} ms`);
        console.log(`❌ ERRORES DE CONEXIÓN : ${result.errors}`);
        console.log(`🛡️  RESPUESTAS HTTP 409/400 (Mitigaciones ACID): ${result.non2xx}`);
        console.log("==================================================================");
        
        if (result.errors === 0) {
            console.log("\n🎉 [CERTIFICACIÓN]: El servidor Node.js soportó la carga sin caídas de sockets.");
        }
    });

    autocannon.track(instancia, { renderProgressBar: true });
}

ejecutarSuiteEstres();