import mongoose from 'mongoose';

export const conectarDB = async () => {
    try {
        // Intentamos conectarnos usando la URI del archivo .env
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🚀 ¡MongoDB Conectado con éxito a la nube de Atlas!');
    } catch (error) {
        console.error('❌ Error crítico al conectar a MongoDB:', error.message);
        // Cerramos el proceso con error si no se puede conectar
        process.exit(1);
    }
};