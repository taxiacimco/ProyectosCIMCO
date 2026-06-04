// CIMCO-SECURITY: Script Atómico de Inserción Directa Ligero (CEO)
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Carga automática del archivo .env de la raíz del backend
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
        
        const correoAdmin = "admin@test.com";
        console.log(`🔍 Verificando existencia de la cuenta: ${correoAdmin}...`);
        
        // Buscamos si ya existe en la colección 'users'
        const usuarioExistente = await mongoose.connection.db.collection('users').findOne({ email: correoAdmin });

        // Objeto con la estructura de datos que requiere el Core del CEO
        const datosCeo = {
            name: "CARLOS MARIO CEO",
            email: correoAdmin,
            phone: "3101112233",
            password: "123456", // Inserción directa de prueba para desarrollo local
            role: 'ADMIN',
            access_level: 99,
            numero_interno: '57',
            cooperativa: 'TAXIA CIMCO',
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (usuarioExistente) {
            console.log("⚡ Cuenta encontrada. Aplicando elevación de privilegios...");
            await mongoose.connection.db.collection('users').updateOne(
                { email: correoAdmin },
                { $set: { role: 'ADMIN', access_level: 99, numero_interno: '57', cooperativa: 'TAXIA CIMCO' } }
            );
            imprimirExito(correoAdmin);
        } else {
            console.log("⚠️ La cuenta no existía en el clúster de Atlas. Iniciando Inserción Directa...");
            
            // Insertamos el documento directamente en la colección 'users'
            await mongoose.connection.db.collection('users').insertOne(datosCeo);
            imprimirExito(correoAdmin);
        }

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
    console.log(`👤 Usuario: CARLOS MARIO CEO (${correo})`);
    console.log("🛡️  Rol de Sistema: ADMIN");
    console.log("📊 Nivel de Acceso Asignado: 99 (Máximo Control)");
    console.log("🚖 Entidad de Origen: TAXIA CIMCO | Interno: 57");
    console.log("🔓 Contraseña Maestra de Ensayo Inyectada: 123456");
    console.log("==================================================\n");
}

elevarACeo();