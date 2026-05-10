// Versión Arquitectura: V1.0 - Cron Job de Limpieza Atómica
/**
 * cleanup.js
 * Misión: Eliminar documentos de chat en el Path Sagrado que tengan más de 3 días.
 * Ejecución: Cada 24 horas.
 */
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

export const purgeOldMessages = onSchedule("0 0 * * *", async (event) => {
    const db = getFirestore();
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

    const pathMensajes = `artifacts/taxiacimco-app/public/data/mensajes`;
    
    try {
        const snapshot = await db.collection(pathMensajes)
            .where("timestamp", "<", tresDiasAtras)
            .get();

        if (snapshot.empty) {
            logger.info("No hay mensajes basura para limpiar.");
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        
        await batch.commit();
        logger.info(`🧹 Limpieza exitosa: ${snapshot.size} mensajes eliminados.`);
    } catch (error) {
        logger.error("Error en purgeOldMessages:", error);
    }
});