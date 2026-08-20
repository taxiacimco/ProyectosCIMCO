import 'dotenv/config';
import mongoose from 'mongoose';
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

import Pasajero from '../src/models/Pasajero.js';

async function sincronizarPasajerosAFirebase() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('No se encontró MONGODB_URI en el archivo .env');
    }

    await mongoose.connect(mongoUri);
    console.log('📡 Conexión establecida con MongoDB...');

    const pasajeros = await Pasajero.find({});
    console.log(`🔍 Analizando ${pasajeros.length} registros en la colección 'pasajeros'...`);

    for (const user of pasajeros) {
      if (!user.email) continue;

      try {
        await admin.auth().getUserByEmail(user.email);
        console.log(`✅ Ya registrado en Firebase Auth: ${user.email}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          const newUser = await admin.auth().createUser({
            email: user.email,
            displayName: user.fullName || user.nombre || 'Pasajero CIMCO',
            password: 'ClaveTemporal2026*',
            emailVerified: true
          });

          user.firebaseUid = newUser.uid;
          await user.save();

          console.log(`🚀 Sincronizado a Firebase Auth con éxito: ${user.email}`);
        } else {
          console.error(`❌ Error al procesar ${user.email}:`, error.message);
        }
      }
    }
    console.log('🎉 Sincronización completada con éxito.');
  } catch (err) {
    console.error('❌ Error general en la sincronización:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

sincronizarPasajerosAFirebase();