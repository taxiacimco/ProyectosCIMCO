/**
 * Ubicación: backend/scripts/stress_test_captura_firestore.cjs
 * Misión: Validar la captura atómica concurrente de una oferta de viaje en Firestore mediante runTransaction.
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 🛡️ Forzar conexión al emulador si está configurado en .env o por defecto
if (process.env.VITE_FIREBASE_EMULATOR === 'true' || process.env.FIREBASE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '192.168.100.34:8085';
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'pelagic-chalice-467818-e1'
  });
}

const db = admin.firestore();
const COLECCION_VIAJES = process.env.VITE_FIRESTORE_PATH_VIAJES || 'viajes';

// Lista de conductores de prueba (extraídos de tus seeders)
const CONDUCTORES_CONCURRENTES = [
  { id: '6a29c73cc8d7b14cd8f85876', nombre: 'Pantera rosa (Mototaxi)' },
  { id: '6a29ca0bc8d7b14cd8f85879', nombre: 'Juan (Parrillero)' },
  { id: '6a29ca9bc8d7b14cd8f8587c', nombre: 'Pedro (Motocarga)' },
  { id: '6a29cbb9c8d7b14cd8f85882', nombre: 'Camilo Castro (Intermunicipal)' }
];

const VIAJE_TEST_ID = 'viaje_concurrente_test_001';

/**
 * Intenta capturar la carrera dentro de una transacción Firestore atómica
 */
async function intentarCapturarCarrera(conductor) {
  const viajeRef = db.collection(COLECCION_VIAJES).doc(VIAJE_TEST_ID);

  try {
    const resultado = await db.runTransaction(async (transaction) => {
      const docSnapshot = await transaction.get(viajeRef);

      if (!docSnapshot.exists) {
        throw new Error('EL_VIAJE_NO_EXISTE');
      }

      const datosViaje = docSnapshot.data();

      // Validación de consistencia: solo capturar si sigue SOLICITADO
      if (datosViaje.estado !== 'SOLICITADO') {
        throw new Error(`CARRERA_YA_TOMADA por conductor: ${datosViaje.conductorId}`);
      }

      // Adjudicar servicio al primer hilo que confirme la transacción
      transaction.update(viajeRef, {
        estado: 'ACEPTADO',
        conductorId: conductor.id,
        conductorNombre: conductor.nombre,
        fechaAceptacion: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return `CARRERA_ASIGNADA_A_${conductor.nombre}`;
    });

    console.log(`✅ [ÉXITO - 200] ${conductor.nombre}: ${resultado}`);
    return { status: 'GANADOR', conductor: conductor.nombre };
  } catch (error) {
    console.warn(`⚠️ [RECHAZADO - 409] ${conductor.nombre}: ${error.message}`);
    return { status: 'BLOQUEADO', conductor: conductor.nombre, motivo: error.message };
  }
}

async function ejecutarSimulacionConcurrente() {
  console.log('==================================================================');
  console.log('🚀 [CIMCO-FIRESTORE] Prueba de Captura Concurrente de Ofertas');
  console.log('==================================================================');

  // 1. Preparar oferta de prueba inicial
  const ofertaInicial = {
    estado: 'SOLICITADO',
    pasajeroId: '6a29b491c8d7b14cd8f85871',
    origen: 'Parque Principal La Jagua',
    destino: 'Barrio El Prado',
    valor: 5000,
    conductorId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(COLECCION_VIAJES).doc(VIAJE_TEST_ID).set(ofertaInicial);
  console.log(`📌 Viaje de prueba inicializado ID: [${VIAJE_TEST_ID}] (Estado: SOLICITADO)\n`);

  // 2. Disparar colisión simultánea con Promise.all
  console.log(`⚡ Lanzando ${CONDUCTORES_CONCURRENTES.length} peticiones de aceptación simultáneas...`);
  const tiempoInicio = Date.now();

  const resultados = await Promise.all(
    CONDUCTORES_CONCURRENTES.map((conductor) => intentarCapturarCarrera(conductor))
  );

  const duracion = Date.now() - tiempoInicio;

  // 3. Auditoría del estado final del documento
  const docFinal = await db.collection(COLECCION_VIAJES).doc(VIAJE_TEST_ID).get();
  const datosFinales = docFinal.data();

  console.log('\n==================================================================');
  console.log(`🏁 [AUDITORÍA FINAL DE TRANSACCIÓN] (Tiempo: ${duracion}ms)`);
  console.log(`  • Estado Final en Firestore: ${datosFinales.estado}`);
  console.log(`  • Ganador Adjudicado: ${datosFinales.conductorNombre} [ID: ${datosFinales.conductorId}]`);
  console.log(`  • Peticiones Rechazadas Atómicamente: ${resultados.filter(r => r.status === 'BLOQUEADO').length}`);
  console.log('==================================================================');

  process.exit(0);
}

ejecutarSimulacionConcurrente();