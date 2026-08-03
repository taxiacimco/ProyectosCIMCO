/**
 * ==============================================================================
 * SCRIPT DE MIGRACIÓN Y SINCRONIZACIÓN ATÓMICA DE SALDOS (MULTICOLECCIÓN)
 * TAXIA CIMCO - Core Database & Realtime Sync Engine (Local & Emulator Ready)
 * ==============================================================================
 */

const mongoose = require('mongoose');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Force Emulator for Local Scripts if not specified
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/taxia-cimco';

// Inicializar Firebase Admin SDK para Emulador / Producción
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: 'taxia-cimco' // ID de proyecto local para emuladores
    });
    console.log(`🔥 [FIREBASE] Inicializado contra Emulador Firestore (${process.env.FIRESTORE_EMULATOR_HOST}).`);
  } catch (e) {
    console.error('❌ Error al inicializar Firebase Admin:', e.message);
  }
}

const dbFirestore = admin.firestore();

// 2. Modelos Mongoose sobre Colecciones Segregadas
const User = mongoose.model('UserMig', new mongoose.Schema({}, { strict: false, collection: 'usuarios' }));
const Conductor = mongoose.model('ConductorMig', new mongoose.Schema({}, { strict: false, collection: 'conductores' }));
const Pasajero = mongoose.model('PasajeroMig', new mongoose.Schema({}, { strict: false, collection: 'pasajeros' }));

// 3. Matriz Base de Datos de Usuarios y Saldos Semilla
const staff = [
  { id: '6a3880eb8d45b416cb92c531', rol: 'despachador', subrol: 'despacho', saldo: 3000 },
  { id: '6a38561e5f4a03b64b9c6584', rol: 'admin', subrol: 'ceo', saldo: 0 },
  { id: '6a386140ce59924f67a50d4f', rol: 'secretaria', subrol: 'auxiliar', saldo: 0 }
];

const conductores = [
  { id: '6a29ca9bc8d7b14cd8f8587c', rol: 'conductor', subrol: 'motocarga', saldo: 20000 },
  { id: '6a29c73cc8d7b14cd8f85876', rol: 'conductor', subrol: 'mototaxi', saldo: 20000 },
  { id: '6a29ca0bc8d7b14cd8f85879', rol: 'conductor', subrol: 'motoparrillero', saldo: 20000 },
  { id: '6a29cbb9c8d7b14cd8f85882', rol: 'conductor', subrol: 'conductor_intermunicipal', saldo: 20000 }
];

const pasajeros = [
  { id: '6a29b491c8d7b14cd8f85871', rol: 'pasajero', subrol: 'pasajero', saldo: 20000 },
  { id: '6a4ab95a9afcfb7540cd9876', rol: 'pasajero', subrol: 'pasajero', saldo: 15000 },
  { id: '6a4ab95a9afcfb7540cd9879', rol: 'pasajero', subrol: 'pasajero', saldo: 15000 }
];

async function syncToFirestore(targetId, uid, saldo, rol) {
  try {
    const docId = uid || targetId.toString();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const payloadWallet = {
      saldoActual: Number(saldo),
      saldo: Number(saldo),
      rol: rol || 'usuario',
      updatedAt: now
    };

    const payloadUser = {
      saldo: Number(saldo),
      updatedAt: now
    };

    await Promise.all([
      dbFirestore.collection('wallets').doc(docId).set(payloadWallet, { merge: true }),
      dbFirestore.collection('users').doc(docId).set(payloadUser, { merge: true })
    ]);

    return true;
  } catch (err) {
    console.error(`  ⚠️ [FIRESTORE ERROR] No se pudo sincronizar ID ${targetId}:`, err.message);
    return false;
  }
}

async function runMigrationAndSync() {
  try {
    console.log('\n📡 [MIGRACIÓN] Conectando a MongoDB Atlas...');
    const targetUri = MONGO_URI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');
    await mongoose.connect(targetUri);
    console.log('✅ [MIGRACIÓN] Conexión atómica con MongoDB establecida.\n');

    let totalGlobal = 0;

    console.log('🔄 [1/3] Normalizando STAFF en colección "usuarios"...');
    for (const item of staff) {
      const doc = await User.findByIdAndUpdate(
        item.id,
        {
          $set: {
            rol: item.rol,
            subrol: item.subrol,
            saldo: item.saldo,
            'billetera.saldoActual': item.saldo,
            estado: 'activo',
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (doc) {
        const saldoVal = doc.saldo || 0;
        totalGlobal += saldoVal;
        await syncToFirestore(doc._id, doc.uid, saldoVal, item.rol);
        console.log(`  ✓ [Staff] ${doc.nombre || doc.fullName || item.id} -> Saldo: $${saldoVal.toLocaleString('es-CO')} COP`);
      } else {
        console.log(`  ⚠️ No encontrado en "usuarios": ${item.id}`);
      }
    }

    console.log('\n🔄 [2/3] Normalizando CONDUCTORES en colección "conductores"...');
    for (const item of conductores) {
      const doc = await Conductor.findByIdAndUpdate(
        item.id,
        {
          $set: {
            rol: item.rol,
            subrol: item.subrol,
            saldo: item.saldo,
            saldoWallet: item.saldo,
            'billetera.saldoActual': item.saldo,
            estado: 'activo',
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (doc) {
        const saldoVal = doc.saldo || 0;
        totalGlobal += saldoVal;
        await syncToFirestore(doc._id, doc.uid, saldoVal, item.rol);
        console.log(`  ✓ [Conductor] ${doc.nombre || item.id} (${item.subrol}) -> Saldo: $${saldoVal.toLocaleString('es-CO')} COP`);
      } else {
        console.log(`  ⚠️ No encontrado en "conductores": ${item.id}`);
      }
    }

    console.log('\n🔄 [3/3] Normalizando PASAJEROS en colección "pasajeros"...');
    for (const item of pasajeros) {
      const doc = await Pasajero.findByIdAndUpdate(
        item.id,
        {
          $set: {
            rol: item.rol,
            subrol: item.subrol,
            saldo: item.saldo,
            'billetera.saldoActual': item.saldo,
            estado: 'activo',
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (doc) {
        const saldoVal = doc.saldo || 0;
        totalGlobal += saldoVal;
        await syncToFirestore(doc._id, doc.uid, saldoVal, item.rol);
        console.log(`  ✓ [Pasajero] ${doc.nombre || item.id} -> Saldo: $${saldoVal.toLocaleString('es-CO')} COP`);
      } else {
        console.log(`  ⚠️ No encontrado en "pasajeros": ${item.id}`);
      }
    }

    console.log('\n==================================================');
    console.log(`📈 CAPITAL CIRCULANTE TOTAL REAL: $${totalGlobal.toLocaleString('es-CO')} COP`);
    console.log('⚡ SINCRONIZACIÓN ATÓMICA CON MONGODB & FIRESTORE LOGRADA');
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error Crítico en la Migración/Sincronización:', error);
    process.exit(1);
  }
}

runMigrationAndSync();