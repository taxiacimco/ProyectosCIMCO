// backend/scripts/actualizar-pasajero.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taxiacimco';

async function actualizarUsuario() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const userId = '6a29b491c8d7b14cd8f85871';
    const nuevosDatos = {
      email: 'carlosmariofuentesgarcia@gmail.com',
      telefono: '3003503249',
      celular: '3003503249'
    };

    const resultado = await mongoose.connection.db.collection('usuarios').updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: nuevosDatos }
    );

    if (resultado.matchedCount > 0) {
      console.log('🎉 Usuario actualizado correctamente:', nuevosDatos);
    } else {
      console.log('⚠️ No se encontró el usuario con el ID especificado.');
    }

  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

actualizarUsuario();