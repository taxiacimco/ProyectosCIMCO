// Versión Arquitectura: V1.0 - Script Mantenimiento y Sincronización de Índices MongoDB Atlas
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Modelos ajustados a la ruta relativa real (../src/models/)
import Usuario from '../src/models/Usuario.js';
import Pasajero from '../src/models/Pasajero.js';
import Conductor from '../src/models/Conductor.js';
import HistorialSaldo from '../src/models/HistorialSaldo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const sincronizarIndices = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('❌ No se encontró la variable MONGODB_URI en el archivo .env');
    }

    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(mongoUri);

    console.log('⚡ Reconstruyendo B-Trees e índices en Atlas...');
    const resultados = await Promise.all([
      Usuario.syncIndexes(),
      Pasajero.syncIndexes(),
      Conductor.syncIndexes(),
      HistorialSaldo.syncIndexes()
    ]);

    console.log('✅ Sincronización finalizada con éxito. Índices procesados:', resultados);
  } catch (error) {
    console.error('❌ Error al sincronizar índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexión a base de datos cerrada.');
    process.exit(0);
  }
};

sincronizarIndices();