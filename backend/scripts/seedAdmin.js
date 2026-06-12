// Versión Arquitectura: V1.1 - Resolución Absoluta de Variables de Entorno (SEEDER)
/**
 * Ubicación: backend/scripts/seedAdmin.js
 * Misión: Insertar al CEO en producción sin exponer rutas de registro.
 * Seguridad: Verificación de duplicidad y hash de clave real.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Conductor from '../src/models/Conductor.js'; // Ruta relativa al modelo

// Resolución estricta de rutas para ES Modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedAdmin = async () => {
    try {
        // 🛡️ GUARDA DE SEGURIDAD (Anti-Undefined)
        if (!process.env.MONGODB_URI) {
            throw new Error("⚠️ MONGODB_URI es undefined. El archivo .env no se cargó correctamente.");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("📡 [CIMCO-SEEDER] Conexión establecida para inyección...");

        const emailCEO = "taxiacimco@gmail.com";
        const claveReal = "Mijagua*57";
        
        const existe = await Conductor.findOne({ email: emailCEO });
        
        if (existe) {
            console.log("⚠️ [CIMCO-SEEDER] El usuario CEO ya existe en base de datos. Operación abortada por seguridad.");
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(claveReal, salt);

            const nuevoAdmin = new Conductor({
                nombre: "CARLOS MARIO CEO",
                email: emailCEO,
                password: hashedPassword,
                role: "admin",
                rol: "admin",
                access_level: 99,
                telefono: "0000000000" // Placeholder
            });

            await nuevoAdmin.save();
            console.log("✅ [CIMCO-SEEDER] Perfil CEO inyectado exitosamente en el clúster.");
        }
    } catch (error) {
        console.error("❌ [CIMCO-SEEDER] Error crítico:", error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

seedAdmin();