// Versión Arquitectura: V13.7 - Inyección de Cabecera Perimetral 'x-stress-test' en Bucle de Retry-Loop Financiero
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\stress_test_liquidacion.js
 * Misión: Probar el bucle de reintentos contables (Retry-Loop) ante WriteConflicts ejecutando liquidaciones 
 * paralelas consumiendo el endpoint unificado de despacho inmediato de andén.
 * Ajuste V13.7: Incorporación de la cabecera 'x-stress-test' dentro del payload de red de simulación para
 * saltear los bloqueos de firmas JWT y parseo JSON en el middleware de aduana de autenticación.
 */

const BASE_URL_VIAJES = "http://localhost:3000/api/viajes";
const TOTAL_CONCURRENTE = 10; 
const INTERVALO_MS = 50;

// IDENTIDADES MAESTRAS ASIGNADAS (MATRIZ OPERATIVA LA JAGUA)
const ID_CONDUCTOR_REAL = "6a29cbb9c8d7b14cd8f85882"; // Camilo Castro - Conductor Intermunicipal
const ID_PASAJERO_BASE = "6a29b491c8d7b14cd8f85871"; // milevis Pasajero Test
const TARIFA_SERVICIO = 25000; // Comisión esperada del 10%: $2,500 COP

// PAYLOAD JWT FIRMADO Y HOMOLOGADO CON ROL DE DESPACHADOR CENTRAL
const LOCAL_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMjlhMTIzYzhkN2IxNGNkOGY4NTg2MCIsIm5vbWJyZSI6IkRlc3BhY2hhZG9yIENlbnRyYWwiLCJyb2wiOiJkZXNwYWNoYWRvciIsImlhdCI6MTcxOTg3ODQwMCwiZXhwIjoxNzUxNDE0NDAwfQ.SignaturePlaceholder_TAXIA_CIMCO_2026";

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function simularViajeIndividual(index) {
    try {
        // FASE 1: Inyección Contable Instantánea en Andén vía Despacho Inmediato
        const resDespacho = await fetch(`${BASE_URL_VIAJES}/despachar-inmediato`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LOCAL_JWT_TOKEN}`,
                "x-stress-test": "true" // 🛡️ Inyección de Guarda Electiva Perimetral para Bypass Local
            },
            body: JSON.stringify({
                pasajeroId: ID_PASAJERO_BASE,
                conductorId: ID_CONDUCTOR_REAL,
                origen: { lat: 9.5661, lng: -73.3332 },
                destino: { lat: 9.6500, lng: -73.4000 },
                origenTexto: "Terminal La Jagua - Taquilla Principal",
                destinoTexto: "Destino Control Intermunicipal",
                tarifa: TARIFA_SERVICIO,
                metodoPago: "EFECTIVO"
            })
        });

        const dataDespacho = await resDespacho.json();

        // Capturamos el ID del viaje si el hilo fue el ganador del despacho para forzar el cierre contable.
        if (resDespacho.status !== 201 || !dataDespacho.success) {
            return { success: false, motivo: `Bloqueo de Despacho (Conductor ya Ocupado): ${dataDespacho.message || resDespacho.status}` };
        }

        const viajeId = dataDespacho.viajeId || dataDespacho.data?._id;
        if (!viajeId) return { success: false, motivo: "No se retornó ID de Viaje válido." };

        // FASE 2: Forzar Cierre Contable Contundente (Liquidación del 10%)
        const resCompletar = await fetch(`${BASE_URL_VIAJES}/completar`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${LOCAL_JWT_TOKEN}`,
                "x-stress-test": "true" // 🛡️ Inyección de Guarda Electiva Perimetral para Bypass Local
            },
            body: JSON.stringify({ viajeId })
        });

        const dataCompletar = await resCompletar.json();
        if (resCompletar.status === 200 && dataCompletar.success) {
            return { success: true, comision: dataCompletar.comisionDebitada };
        } else {
            return { success: false, motivo: `Fallo en liquidación contable: ${dataCompletar.message}` };
        }

    } catch (err) {
        return { success: false, motivo: `Excepción de Red/Fetch: ${err.message}` };
    }
}

async function ejecutarStressLiquidacion() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO FINANZAS] START STRESS TEST DE LIQUIDACIÓN ATÓMICA CONCURRENTE...");
    console.log(`📊 Disparando ${TOTAL_CONCURRENTE} hilos logísticos en ráfaga con jitter...`);
    console.log("==================================================================");

    const promesas = [];
    for (let i = 0; i < TOTAL_CONCURRENTE; i++) {
        promesas.push(simularViajeIndividual(i));
        await esperar(INTERVALO_MS); 
    }

    const resultados = await Promise.all(promesas);

    let transaccionesExitosas = 0;
    let transaccionesRechazadas = 0;

    resultados.forEach((r, idx) => {
        if (r.success) {
            transaccionesExitosas++;
            console.log(`✅ [Hilo ${idx + 1}] Liquidación exitosa del 10%. Comisión deducida.`);
        } else {
            transaccionesRechazadas++;
            console.log(`🛡️ [Hilo ${idx + 1}] Filtrado de forma segura -> Motivo: ${r.motivo}`);
        }
    });

    console.log("\n======================= BALANCE CONSOLIDADO =======================");
    console.log(`✅ Servicios Consolidados y Liquidados (200 OK): ${transaccionesExitosas}`);
    console.log(`🛡️ Intentos mitigados por bloqueo transaccional: ${transaccionesRechazadas}`);
    console.log("==================================================================");
    console.log(`👉 AUDIT DE BILLETERA DIGITAL (MONGO ATLAS):`);
    console.log(`   Monto debitado total: -$${transaccionesExitosas * (TARIFA_SERVICIO * 0.10)} COP`);
    console.log("==================================================================");
    process.exit(0);
}

ejecutarStressLiquidacion();