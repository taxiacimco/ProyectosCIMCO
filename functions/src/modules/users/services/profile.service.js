// Versión Arquitectura: V7.3 - Lógica de Flotas y Cooperativas (Corregido)
import { db } from "../../../config/firebase.js";

class ProfileService {
    // Usamos # para propiedades privadas en JS moderno
    #basePath = "artifacts/taxiacimco-app/public/data/profiles";

    /**
     * Obtiene conductores activos de una flota específica.
     * Misión: Asegurar que el despachador solo vea su cooperativa.
     */
    async getDriversByFleet(fleetId) {
        try {
            const snapshot = await db.collection(this.#basePath)
                .where('fleetId', '==', fleetId)
                .where('status', '==', 'ACTIVE')
                .where('role', 'in', ['intermunicipal', 'motocarga']) // Extendible a otros roles
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("❌ [ProfileService] Error filtrando flota:", error.message);
            throw error;
        }
    }

    /**
     * Inicializa perfil con soporte para FleetId (Cooperativa)
     */
    async initializeProfessionalProfile(uid, data) {
        try {
            const profileRef = db.doc(`${this.#basePath}/${uid}`);
            const newProfile = {
                uid,
                fullName: data.fullName,
                email: data.email,
                role: data.role,
                fleetId: data.fleetId || 'GENERAL', // 'GENERAL' para independientes
                status: 'PENDING_APPROVAL',
                walletBalance: 0,
                feePerService: data.role === 'motocarga' ? 500 : 0, // Regla de negocio solicitada
                createdAt: new Date().toISOString()
            };

            await profileRef.set(newProfile, { merge: true });
            return { success: true, profile: newProfile };
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            throw error;
        }
    }
}

export default new ProfileService();