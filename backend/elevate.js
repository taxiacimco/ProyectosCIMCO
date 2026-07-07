// Versión Arquitectura: V1.2 - Corrección de Inyección a Colección Estandarizada 'usuarios'
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function elevarACeo() {
    try {
        if (!MONGO_URI) {
            throw new Error("No se detectó la variable MONGODB_URI en el archivo .env.");
        }

        console.log("📡 Conectando directamente con MongoDB Atlas de TAXIA CIMCO...");
        await mongoose.connect(MONGO_URI);
        console.log("🟢 ¡Conexión establecida con el clúster de Atlas!");
        
        // Credencial principal homologada
        const correoAdmin = "taxiacimco@gmail.com"; 
        
        // ⚠️ CORRECCIÓN ARQUITECTÓNICA: Apuntamos a 'usuarios', no a 'users'
        const coleccion = mongoose.connection.db.collection('usuarios');
        const usuarioExistente = await coleccion.findOne({ email: correoAdmin });

        const datosCeo = {
            name: "CARLOS MARIO FUENTES GARCIA",
            email: correoAdmin,
            phone: "3101112233",
            password: "123456", // Clave temporal para desarrollo. Cambiar en UI posteriormente.
            role: 'ADMIN',
            access_level: 99,
            numero_interno: '01',
            cooperativa: 'TAXIA CIMCO',
            isActive: true
        };

        if (usuarioExistente) {
            console.log(`🔄 Actualizando privilegios de la cuenta existente: ${correoAdmin}...`);
            await coleccion.updateOne(
                { email: correoAdmin },
                { $set: { role: 'ADMIN', access_level: 99, isActive: true } }
            );
        } else {
            console.log("⚠️ La cuenta no existía en 'usuarios'. Iniciando Inserción Directa...");
            await coleccion.insertOne(datosCeo);
        }

        imprimirExito(correoAdmin);

    } catch (error) {
        console.error("❌ Error crítico en la pasarela de seguridad:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Conexión con Atlas cerrada de forma segura.");
        process.exit(0);
    }
}

function imprimirExito(correo) {
    console.log("\n👑 ===============================================");
    console.log("⚡ [CIMCO-ÉXITO] ¡CREDENCIAL SUPREMA DE CEO REGISTRADA!");
    console.log(`👤 Usuario: CARLOS MARIO FUENTES GARCIA (${correo})`);
    console.log("🛡️  Rol de Sistema: ADMIN");
    console.log("📊 Nivel de Acceso Asignado: 99 (Máximo Control)");
    console.log("🚖 Entidad de Origen: TAXIA CIMCO");
    console.log("===============================================\n");
}

elevarACeo();