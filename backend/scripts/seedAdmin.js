// Versión Arquitectura: V1.5 - Certificación de Namespace, Gobernanza Estricta de Niveles de Acceso y Purga Atómica
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\seedAdmin.js
 * Misión: Registrar la cuenta sagrada del CEO y roles de alta jerarquía asegurando consistencia nominal absoluta.
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
        let URI = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!URI) {
            throw new Error("⚠️ MONGODB_URI/MONGO_URI es undefined. El archivo .env no se cargó o definió correctamente.");
        }

        // 🛡️ COMPUERTA DEFENSIVA: Normalizar el string de la URI para evitar fragmentación por Case-Sensitivity
        URI = URI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

        console.log("📡 [CIMCO-SEED-ADMIN] Conectando a la matriz de datos de MongoDB Atlas...");
        await mongoose.connect(URI);
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error("🚨 [CIMCO-SEED-FATAL] No se pudo obtener la instancia de base de datos activa.");
        }

        console.log("📡 [CIMCO-SEED-ADMIN] Conectado. Verificando integridad del CEO y roles de control...");

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("123456", salt);

        // Dataset unificado de alta jerarquía y control operativo
        const usuariosSemilla = [
            {
                fullName: "CARLOS MARIO FUENTES GARCIA",
                email: "admin@taxiacimco.com",
                password: hash,
                rol: "admin",
                role: "admin",
                access_level: 99, // Nivel Sagrado del CEO
                estado: "activo",
                fechaCreacion: new Date()
            }
        ];

        // Procesamiento y gobernanza estricta en la colección unificada 'usuarios'
        for (const datosUsuario of usuariosSemilla) {
            // Guardas de Seguridad anti-undefined para el payload
            if (!datosUsuario || !datosUsuario.email || !datosUsuario.access_level) {
                console.log("⚠️ [CIMCO-SEED] Payload de usuario semilla malformado u omitido.");
                continue;
            }

            const usuarioExistente = await db.collection('usuarios').findOne({ email: datosUsuario.email });

            if (usuarioExistente) {
                await db.collection('usuarios').updateOne(
                    { email: datosUsuario.email },
                    { 
                        $set: { 
                            password: datosUsuario.password, 
                            access_level: datosUsuario.access_level, 
                            role: datosUsuario.role, 
                            rol: datosUsuario.rol, 
                            fullName: datosUsuario.fullName,
                            estado: "activo",
                            updatedAt: new Date()
                        } 
                    }
                );
                console.log(`🔄 [CIMCO-SEED] Privilegios y credenciales de [${datosUsuario.fullName}] (Nivel ${datosUsuario.access_level}) re-sincronizados.`);
            } else {
                await db.collection('usuarios').insertOne(datosUsuario);
                console.log(`🚀 [CIMCO-SEED] ¡Usuario [${datosUsuario.fullName}] (Nivel ${datosUsuario.access_level}) inyectado con éxito en 'usuarios'!`);
            }
        }

        // 🧹 PASO 3: Purga, Saneamiento Final y Destrucción de la colección residual 'users'
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