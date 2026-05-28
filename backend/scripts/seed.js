// Versión Arquitectura: V9.4 - Integración Quirúrgica con Modelos Detectados
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\seed.js
 * Misión: Sembrador maestro sincronizado con la estructura real de archivos (Pasajero.js / Conductor.js).
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// IMPORTACIÓN SEGURA basada en tu estructura de directorios actual
import Conductor from '../src/models/Conductor.js';
import Pasajero from '../src/models/Pasajero.js'; 

const seed = async () => {
    try {
        console.log("📡 [CIMCO-SEED] Conectando a MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("123456", salt);

        console.log("⚡ Iniciando sincronización de nodos...");

        // 👤 NODO PASAJERO (Usando tu modelo real: Pasajero.js)
        await Pasajero.updateOne(
            { telefono: "3003503249" },
            { 
                $set: { 
                    nombre: "Carlos Mario Fuentes", 
                    email: "carlosmariofuentesgarcia@gmail.com", 
                    password: hash, 
                    role: 'pasajero',
                    estado: "activo"
                } 
            },
            { upsert: true }
        );
        console.log("✅ [NODO PASAJERO] Sincronizado correctamente.");

        // 🚖 NODO CONDUCTOR (Usando tu modelo real: Conductor.js)
        await Conductor.updateOne(
            { email: "camafug@gmail.com" },
            { 
                $set: { 
                    nombre: "Mototaxista Base Pro", 
                    telefono: "3104180514", 
                    password: hash, 
                    role: 'conductor',
                    estado: "active",
                    saldo: 14000
                } 
            },
            { upsert: true }
        );
        console.log("✅ [NODO CONDUCTOR] Sincronizado correctamente.");

        console.log("\n📊 --- RESUMEN: Malla de datos unificada con éxito absoluto ---");
        process.exit(0);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO EN EL BUS DE DATOS SEED:", error.message);
        process.exit(1);
    }
};

seed();