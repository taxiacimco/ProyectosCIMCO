// Versión Arquitectura: V1.4 - Inyección Segura de CEO y Purga de Deuda Técnica
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\seedAdmin.js
 * Misión: Registrar la cuenta sagrada del CEO en el clúster asegurando consistencia nominal absoluta.
 * Integridad: Fusión Atómica. Omite la persistencia redundante en modelos de 'conductores' e
 * inyecta el perfil de acceso total (nivel 99) exclusivamente en la colección unificada 'usuarios'
 * mediante el driver nativo de MongoDB. Ejecuta purga automática de colecciones 'users' residuales.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolución estricta de rutas para ES Modules y variables de entorno locales
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedAdmin = async () => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
        const URI = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!URI) {
            throw new Error("⚠️ MONGODB_URI/MONGO_URI es undefined. El archivo .env no se cargó o definió correctamente.");
        }

        console.log("📡 [CIMCO-SEED-ADMIN] Conectando a la matriz de datos de MongoDB Atlas...");
        await mongoose.connect(URI);
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error("🚨 [CIMCO-SEED-FATAL] No se pudo obtener la instancia de base de datos activa.");
        }

        console.log("📡 [CIMCO-SEED-ADMIN] Conectado. Verificando integridad del CEO...");

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("123456", salt);

        const datosUsuarioAdmin = {
            fullName: "CARLOS MARIO FUENTES GARCIA",
            email: "admin@taxiacimco.com",
            password: hash,
            rol: "admin",
            role: "admin",
            access_level: 99,
            estado: "activo",
            fechaCreacion: new Date()
        };

        // Verificación y actualización atómica para evitar duplicación nominal o de índices únicos
        const adminExistente = await db.collection('usuarios').findOne({ email: datosUsuarioAdmin.email });

        if (adminExistente) {
            await db.collection('usuarios').updateOne(
                { email: datosUsuarioAdmin.email },
                { 
                    $set: { 
                        password: hash, 
                        access_level: 99, 
                        role: 'admin', 
                        rol: 'admin', 
                        fullName: "CARLOS MARIO FUENTES GARCIA" 
                    } 
                }
            );
            console.log("🔄 [CIMCO-SEED] Firma criptográfica y privilegios de CEO (Nivel 99) re-sincronizados.");
        } else {
            await db.collection('usuarios').insertOne(datosUsuarioAdmin);
            console.log("🚀 [CIMCO-SEED] ¡ADMINISTRADOR/CEO INYECTADO CON ÉXITO EN LA COLECCIÓN 'usuarios'!");
        }

        // 🧹 PASO 3: Purga y Saneamiento Final de Dualidad en MongoDB Atlas
        const collections = await db.listCollections({ name: 'users' }).toArray();
        if (collections.length > 0) {
            console.log("🧹 [CIMCO-SANEAMIENTO] Alerta de Deuda Técnica: Colección residual 'users' detectada. Purgando del clúster...");
            await db.collection('users').drop();
            console.log("💥 [CIMCO-SANEAMIENTO] Purga completada: Colección 'users' eliminada definitivamente.");
        } else {
            console.log("🛡️ [CIMCO-SANEAMIENTO] Ecosistema limpio: No se detectaron colecciones 'users' duplicadas en el clúster.");
        }

    } catch (error) {
        console.error("🚨 [CIMCO-SEED-FATAL] Fallo crítico al ejecutar poblamiento de administración:", error);
    } finally {
        console.log("🔌 [CIMCO-SEED] Desconectando el bus de datos de manera segura.");
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedAdmin();