const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Definición de modelos para las colecciones separadas
const User = mongoose.model('UserMig', new mongoose.Schema({}, { strict: false, collection: 'usuarios' }));
const Conductor = mongoose.model('ConductorMig', new mongoose.Schema({}, { strict: false, collection: 'conductores' }));
const Pasajero = mongoose.model('PasajeroMig', new mongoose.Schema({}, { strict: false, collection: 'pasajeros' }));

async function runMigration() {
  try {
    console.log('📡 [MIGRACIÓN] Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGO_URI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco'));
    console.log('✅ [MIGRACIÓN] Conexión establecida con éxito.\n');

    // 1. Personal Administrativo y Despacho (Colección: usuarios)
    const staff = [
      { id: '6a3880eb8d45b416cb92c531', rol: 'despachador', subrol: 'despacho', saldo: 3000 },
      { id: '6a38561e5f4a03b64b9c6584', rol: 'admin', subrol: 'ceo', saldo: 0 },
      { id: '6a386140ce59924f67a50d4f', rol: 'secretaria', subrol: 'auxiliar', saldo: 0 }
    ];

    // 2. Escuadrón de Conductores (Colección: conductores - Total $80.000 COP)
    const conductores = [
      { id: '6a29ca9bc8d7b14cd8f8587c', rol: 'conductor', subrol: 'motocarga', saldo: 20000 },
      { id: '6a29c73cc8d7b14cd8f85876', rol: 'conductor', subrol: 'mototaxi', saldo: 20000 },
      { id: '6a29ca0bc8d7b14cd8f85879', rol: 'conductor', subrol: 'motoparrillero', saldo: 20000 },
      { id: '6a29cbb9c8d7b14cd8f85882', rol: 'conductor', subrol: 'conductor_intermunicipal', saldo: 20000 }
    ];

    // 3. Pasajeros (Colección: pasajeros - Total $50.000 COP)
    const pasajeros = [
      { id: '6a29b491c8d7b14cd8f85871', rol: 'pasajero', subrol: 'pasajero', saldo: 20000 },
      { id: '6a4ab95a9afcfb7540cd9876', rol: 'pasajero', subrol: 'pasajero', saldo: 15000 },
      { id: '6a4ab95a9afcfb7540cd9879', rol: 'pasajero', subrol: 'pasajero', saldo: 15000 }
    ];

    let totalGlobal = 0;

    console.log('🔄 Sincronizando STAFF en colección "usuarios"...');
    for (const item of staff) {
      const doc = await User.findByIdAndUpdate(
        item.id,
        { $set: { rol: item.rol, subrol: item.subrol, saldo: item.saldo, estado: 'activo', updatedAt: new Date() } },
        { new: true }
      );
      if (doc) {
        console.log(`  ✓ [Staff] ${doc.nombre || doc.fullName} -> Saldo: $${doc.saldo} COP`);
        totalGlobal += doc.saldo || 0;
      }
    }

    console.log('\n🔄 Sincronizando CONDUCTORES en colección "conductores"...');
    for (const item of conductores) {
      const doc = await Conductor.findByIdAndUpdate(
        item.id,
        { $set: { rol: item.rol, subrol: item.subrol, saldo: item.saldo, saldoWallet: item.saldo, estado: 'activo', updatedAt: new Date() } },
        { new: true }
      );
      if (doc) {
        console.log(`  ✓ [Conductor] ${doc.nombre} (${item.subrol}) -> Saldo: $${doc.saldo} COP`);
        totalGlobal += doc.saldo || 0;
      } else {
        console.log(`  ⚠️ No encontrado en "conductores": ${item.id}`);
      }
    }

    console.log('\n🔄 Sincronizando PASAJEROS en colección "pasajeros"...');
    for (const item of pasajeros) {
      const doc = await Pasajero.findByIdAndUpdate(
        item.id,
        { $set: { rol: item.rol, subrol: item.subrol, saldo: item.saldo, estado: 'activo', updatedAt: new Date() } },
        { new: true }
      );
      if (doc) {
        console.log(`  ✓ [Pasajero] ${doc.nombre} -> Saldo: $${doc.saldo} COP`);
        totalGlobal += doc.saldo || 0;
      } else {
        console.log(`  ⚠️ No encontrado en "pasajeros": ${item.id}`);
      }
    }

    console.log('\n==================================================');
    console.log(`📈 CAPITAL CIRCULANTE REAL CONSOLIDADO: $${totalGlobal.toLocaleString('es-CO')} COP`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

runMigration();