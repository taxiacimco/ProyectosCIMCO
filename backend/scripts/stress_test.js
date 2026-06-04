// Versión Arquitectura: V1.8 - Forzado de Entorno Local para Emuladores
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\stress_test.js

// 🔥 CONFIGURACIÓN DE EMERGENCIA: Obliga al Admin SDK a usar el emulador local de Firestore
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

// Ahora sí, importamos el resto de módulos de forma segura
import { db, RUTA_VIAJES_PROD } from '../src/config/firebase.js'; 

const TOTAL_VIAJES = 5; 

async function ejecutarStressTest() {
    console.log("==================================================================");
    console.log("🚀 [CIMCO-STRESS] Iniciando inyección atómica en EMULADOR LOCAL...");
    console.log(`📍 Host Emulador: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`📍 Ruta Destino: ${RUTA_VIAJES_PROD}`);
    console.log("==================================================================");

    for (let i = 0; i < TOTAL_VIAJES; i++) {
        try {
            const viajeRef = await db.collection(RUTA_VIAJES_PROD).add({
                pasajeroId: `PASAJERO_TEST_${i}`,
                pasajeroNombre: `Pasajero Bot ${i}`,
                origen: { 
                    lat: 9.5661, 
                    lng: -73.3332,
                    direccion: "Barrio Centro, La Jagua"
                }, 
                destino: { 
                    lat: 9.5710, 
                    lng: -73.3421,
                    direccion: "Terminal de Transportes"
                },
                oferta: Math.floor(Math.random() * 5000) + 4000, 
                estadoViaje: "buscando",
                createdAt: new Date() 
            });

            console.log(`✅ [VIAJE EMULADO ${i}] Inyectado con éxito. ID: ${viajeRef.id}`);

            setTimeout(async () => {
                try {
                    await db.collection(RUTA_VIAJES_PROD).doc(viajeRef.id).update({
                        estadoViaje: "aceptado",
                        conductorId: "CONDUCTOR_BOT_JAGUA",
                        conductorNombre: "Mototaxista Base Pro",
                        aceptadoEn: new Date()
                    });
                    console.log(`  🏍️ -> [VIAJE ${i}] Estado transicionado a 'aceptado' en emulador.`);
                } catch (err) {
                    console.error(`❌ Fallo en transición diferida para viaje ${viajeRef.id}:`, err.message);
                }
            }, 3000);

        } catch (error) {
            console.error(`❌ [ERROR OPERATIVO] Fallo en la inyección de carga ${i}:`, error.message);
        }
    }
}

ejecutarStressTest();