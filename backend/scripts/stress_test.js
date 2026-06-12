// Versión Arquitectura: V2.0 - Test de Concurrencia HTTP Masiva Paralela
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\stress_test.js

const BASE_URL = "http://localhost:3000/api/viajes";
const TOTAL_CONCURRENTE = 10; // Número de hilos paralelos simultáneos

async function simularCicloViajeConcurrente(idHijo) {
    const payloadSolicitud = {
        pasajeroId: `6a29b491c8d7b14cd8f85871`, // Reutiliza el ID de prueba funcional
        origen: {
            lat: 9.56215,
            lng: -73.33418,
            direccion: `Terminal La Jagua Hilo-${idHijo}`
        },
        destino: {
            lat: 9.56800,
            lng: -73.33900,
            direccion: `Barrio Central Hilo-${idHijo}`
        },
        tarifaEstimada: 5000
    };

    try {
        // ----------------------------------------------------------------
        // PASO 1: Lanzar la Solicitud del Viaje vía HTTP POST
        // ----------------------------------------------------------------
        const resSolicitud = await fetch(`${BASE_URL}/solicitar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadSolicitud)
        });

        const dataSolicitud = await resSolicitud.json();

        if (!dataSolicitud.success) {
            console.error(`❌ [HILO-${idHijo}] Falló la creación:`, dataSolicitud.message);
            return;
        }

        const viajeId = dataSolicitud.data._id;
        console.log(`✅ [HILO-${idHijo}] Viaje Creado en Gateway. ID: ${viajeId}`);

        // ----------------------------------------------------------------
        // PASO 2: Aceptación Inmediata Concurrentizada (Simulando Moto)
        // ----------------------------------------------------------------
        const payloadAceptar = {
            viajeId: viajeId,
            conductorId: "6a29c73cc8d7b14cd8f85876" // ID de Pantera Rosa
        };

        const resAceptar = await fetch(`${BASE_URL}/aceptar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadAceptar)
        });

        const dataAceptar = await resAceptar.json();
        
        if (dataAceptar.success) {
            console.log(`  🏍️ -> [HILO-${idHijo}] Asignación Exitosa y Sincronizada.`);
        } else {
            console.warn(`  ⚠️ -> [HILO-${idHijo}] Bloqueado o Rechazado:`, dataAceptar.message);
        }

    } catch (error) {
        console.error(`❌ [HILO-${idHijo}] Error de red / comunicación HTTP:`, error.message);
    }
}

async function ejecutarStressTestConcurrente() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-STRESS HTTP] Iniciando Ataque Masivo Paralelo...");
    console.log(`📍 Endpoint Objetivo: ${BASE_URL}`);
    console.log(`🔥 Total de Peticiones Simultáneas: ${TOTAL_CONCURRENTE}`);
    console.log("==================================================================");

    const startTime = Date.now();
    const promesas = [];

    // Llenamos el array de promesas para dispararlas en ráfaga paralela
    for (let i = 0; i < TOTAL_CONCURRENTE; i++) {
        promesas.push(simularCicloViajeConcurrente(i));
    }

    // 🔥 Aquí ocurre la magia de la concurrencia: se ejecutan al mismo tiempo
    await Promise.all(promesas);

    const duration = Date.now() - startTime;
    console.log("==================================================================");
    console.log(`🏁 [STRESS TERMINADO] Ráfaga procesada en ${duration}ms`);
    console.log("==================================================================");
}

ejecutarStressTestConcurrente();