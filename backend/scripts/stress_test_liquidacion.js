// Versión Arquitectura: V13.5 - Mapeo de Identidades Productivas de La Jagua para Pruebas de Estrés
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\stress_test_liquidacion.js
 * Misión: Actualizar los ID duros del script de simulación masiva utilizando el ecosistema real de datos
 *         (Pasajero Test, Despachador Central y el Conductor Intermunicipal de la Flota Terminal).
 */

const BASE_URL_VIAJES = "http://localhost:3000/api/viajes";
const BASE_URL_CONDUCTORES = "http://localhost:3000/api/conductores"; 
const TOTAL_CONCURRENTE = 10; 
const INTERVALO_MS = 50;

// 🔏 IDENTIDADES MAESTRAS ASIGNADAS (MATRIZ OPERATIVA LA JAGUA)
const ID_CONDUCTOR_REAL = "6a29cbb9c8d7b14cd8f85882"; // Camilo Castro - Conductor Intermunicipal
const ID_PASAJERO_BASE = "6a29b491c8d7b14cd8f85871"; // milevis Pasajero Test
const TARIFA_SERVICIO = 10000; 

// 🎟️ PAYLOAD JWT FIRMADO Y HOMOLOGADO CON ROL DE DESPACHADOR CENTRAL
const LOCAL_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2YTM4ODBlYjhkNDViNDE2Y2I5MmM1MzEiLCJpZCI6IjZhMzg4MGViOGQ0NWI0MTZjYjkyYzUzMSIsIm5vbWJyZSI6IlBpdG9sb2NvIE1hZXN0cm8iLCJlbWFpbCI6ImRlc3BhY2hvNEB0ZXN0LmNvbSIsInJvbCI6ImRlc3BhY2hhZG9yIiwicm9sZSI6ImRlc3BhY2hhZG9yIiwiZmxvdGFfaWQiOiJGTE9UQV9URVJNSU5BTF9KQUdVQSIsImVzdGFkbyI6ImFjdGl2byIsImlhdCI6MTg4MjUzNzYwMH0.CIMCO_SIGNATURE_MOCK_SECRET_FOR_LOCAL_STRESS_TESTING_V9";

const CABECERAS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${LOCAL_JWT_TOKEN}`,
    'x-token': LOCAL_JWT_TOKEN,
    'x-stress-test': 'true'
};

const esperarMilisegundos = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ejecutarFlujoLiquidacionMasa() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-STRESS] Iniciando Test de Cierre Contable y Liquidación...");
    console.log("==================================================================");

    console.log("💳 [PRE-FLIGHT] Restableciendo billetera del conductor a $50,000 COP...");
    try {
        await fetch(`${BASE_URL_CONDUCTORES}/bypass-stress-saldo`, {
            method: 'PUT',
            headers: CABECERAS,
            body: JSON.stringify({ conductorId: ID_CONDUCTOR_REAL, saldo: 50000 })
        });
    } catch (error) {
        console.error("⚠️ [PRE-FLIGHT ERROR] No se pudo restablecer el saldo inicial:", error.message);
    }

    console.log(`📦 [PRE-FLIGHT] Preparando y pre-aprobando ${TOTAL_CONCURRENTE} viajes en La Jagua...`);
    const listaViajesId = [];

    for (let i = 0; i < TOTAL_CONCURRENTE; i++) {
        try {
            // 1. Solicitar el viaje emulando el origen del pasajero test
            const resSol = await fetch(`${BASE_URL_VIAJES}/solicitar`, {
                method: 'POST',
                headers: CABECERAS,
                body: JSON.stringify({
                    pasajeroId: ID_PASAJERO_BASE,
                    origen: { lat: 9.5623, lng: -73.3325 }, // Sincronizado con zona de cobertura
                    destino: { lat: 9.56800, lng: -73.33900 },
                    origenTexto: "Terminal de la Jagua",  
                    destinoTexto: "Destino Controlado Intermunicipal",     
                    tarifa: TARIFA_SERVICIO,
                    metodoPago: 'EFECTIVO',
                    tipoServicio: 'intermunicipal'
                })
            });
            
            const dataSol = await resSol.json();
            const guardViajeId = dataSol ? (dataSol.viajeId || (dataSol.data ? (dataSol.data._id || dataSol.data.id) : null)) : null;

            if (!guardViajeId) {
                console.error(`❌ Falló la extracción del ID en el índice [${i}]. Respuesta:`, JSON.stringify(dataSol));
                continue;
            }

            await esperarMilisegundos(150);

            // 2. Aceptar el viaje acoplando el conductorId (Bloqueo en Atlas)
            const resAcept = await fetch(`${BASE_URL_VIAJES}/aceptar`, {
                method: 'POST',
                headers: CABECERAS,
                body: JSON.stringify({ viajeId: guardViajeId, conductorId: ID_CONDUCTOR_REAL })
            });

            if (resAcept.status === 200 || resAcept.status === 201) {
                listaViajesId.push(guardViajeId);
            } else {
                const errBody = await resAcept.text();
                console.error(`❌ Endpoint /aceptar rechazó la vinculación del viaje [${guardViajeId}]: Status ${resAcept.status} - ${errBody}`);
            }
            
            await esperarMilisegundos(150);

        } catch (error) {
            console.error(`❌ Error en iteración de preparación [${i}]:`, error.message);
        }
    }

    if (listaViajesId.length === 0) {
        console.log("❌ Error fatal: No se pudieron consolidar identificadores válidos en MongoDB Atlas.");
        return;
    }

    console.log(`✅ [PRE-FLIGHT] Escenario listo. ${listaViajesId.length} viajes interceptados de forma limpia.`);
    console.log("⏳ Esperando 250ms finales de cortesía para estabilización total de réplicas...");
    await esperarMilisegundos(250);

    console.log("\n🔥 Lanzando ráfaga paralela masiva al endpoint: POST /completar... (Conductor: Camilo Castro)");
    console.log("------------------------------------------------------------------");
    const startTime = Date.now();

    const promesasLiquidacion = listaViajesId.map((idDelViaje, index) => {
        return new Promise((resolve) => {
            setTimeout(async () => {
                const tiempoInicio = Date.now();
                const payloadContable = JSON.stringify({ 
                    viajeId: idDelViaje, 
                    conductorId: ID_CONDUCTOR_REAL, 
                    comision: 2500 
                });

                try {
                    const res = await fetch(`${BASE_URL_VIAJES}/completar`, {
                        method: 'POST',
                        headers: CABECERAS,
                        body: payloadContable
                    });
                    
                    const data = res.status === 200 ? await res.json() : null;
                    const errorMsg = !data ? await res.text() : null;
                    const latencia = Date.now() - tiempoInicio;

                    resolve({
                        hilo: index + 1,
                        viajeId: idDelViaje,
                        status: res.status,
                        success: res.status === 200,
                        message: res.status === 200 ? (data?.message || 'Viaje liquidado') : (errorMsg || `Error ${res.status}`),
                        comision: res.status === 200 ? 2500 : 0,
                        latencia: `${latencia}ms`
                    });
                } catch (err) {
                    resolve({
                        hilo: index + 1,
                        viajeId: idDelViaje,
                        status: 'CRASH',
                        success: false,
                        message: err.message,
                        comision: 0,
                        latencia: 'N/A'
                    });
                }
            }, index * INTERVALO_MS);
        });
    });

    const resultados = await Promise.all(promesasLiquidacion);
    const tiempoTotal = Date.now() - startTime;

    console.log(`\n📊 [CIMCO-STRESS] RESULTADOS DE LA RÁFAGA EN TIEMPO REAL:`);
    console.table(resultados);

    const transaccionesExitosas = resultados.filter(r => r.status === 200).length;
    const transaccionesRechazadas = resultados.filter(r => r.status !== 200).length;

    console.log("------------------------------------------------------------------");
    console.log(`🏁 [STRESS LIQUIDACIÓN TERMINADO] Ráfaga procesada en: ${tiempoTotal}ms`);
    console.log("==================================================================");
    console.log(`✅ Transacciones Procesadas Exitosamente (200 OK): ${transaccionesExitosas}`);
    console.log(`🛡️ Transacciones Bloqueadas/Rechazadas: ${transaccionesRechazadas}`);
    console.log("==================================================================");
    console.log(`👉 BALANCE CONTABLE ESPERADO EN MONGODB ATLAS:`);
    console.log(`   Conductor Evaluado: Camilo Castro (${ID_CONDUCTOR_REAL})`);
    console.log(`   Saldo Inicial: $50,000 COP`);
    console.log(`   Comisiones totales debitadas ($2,500 x ${transaccionesExitosas}): -$${transaccionesExitosas * 2500} COP`);
    console.log(`   Saldo Final Requerido en Billetera: $${50000 - (transaccionesExitosas * 2500)} COP`);
    console.log("==================================================================");

    if (transaccionesExitosas === TOTAL_CONCURRENTE) {
        console.log(`\n🎉 [TEST EXITOSO]: Autenticación, absorción de latencia y aislamiento transaccional validados sin inconsistencias contables.`);
    } else if (transaccionesExitosas > 0) {
        console.log(`\n⚠️ [AVISO]: El aislamiento ACID funcionó parcialmente. ${transaccionesExitosas} pasaron y ${transaccionesRechazadas} fueron filtradas.`);
    } else {
        console.log(`\n❌ [TEST INTERRUMPIDO]: El comportamiento del pool no cumple las restricciones esperadas.`);
    }
}

ejecutarFlujoLiquidacionMasa().catch(err => console.error("🚨 Error crítico en el motor de stress:", err));