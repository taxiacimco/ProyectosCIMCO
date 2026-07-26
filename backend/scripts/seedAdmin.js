// C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\seedAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const seedAdmin = async () => {
    try {
        let URI = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!URI) throw new Error("⚠️ MONGODB_URI/MONGO_URI no definida en el .env.");

        URI = URI.replace(/\/TAXIA-CIMCO/i, '/taxia-cimco');

        console.log("📡 [CIMCO-SEED-ADMIN] Conectando a MongoDB Atlas...");
        await mongoose.connect(URI);
        const db = mongoose.connection.db;

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("Mijagua*57", salt);

        const usuariosSemilla = [
            {
                _id: new mongoose.Types.ObjectId("6a38561e5f4a03b64b9c6584"),
                fullName: "CARLOS MARIO FUENTES GARCIA",
                email: "taxiacimco@gmail.com",
                telefono: "3104180514",
                password: hash,
                rol: "admin",
                role: "admin",
                subrol: "ceo",
                access_level: 99,
                estado: "activo",
                saldo: 0,
                updatedAt: new Date()
            }
        ];

        for (const datosUsuario of usuariosSemilla) {
            await db.collection('usuarios').updateOne(
                { email: datosUsuario.email },
                { $set: datosUsuario },
                { upsert: true }
            );
            console.log(`🚀 CEO re-sincronizado atómicamente: ${datosUsuario.fullName} (${datosUsuario.email})`);
        }

    } catch (error) {
        console.error("🚨 Error al ejecutar poblamiento de administración:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

seedAdmin();