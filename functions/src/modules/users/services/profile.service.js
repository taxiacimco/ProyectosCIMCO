// Versión Arquitectura: V7.4 - Blindaje Anti-Undefined y Optimización de Queries de Flota
import { db } from "../../../config/firebase.js";

class ProfileService {
    // Usamos # para propiedades privadas en JS moderno
    #basePath = "artifacts/taxiacimco-app/public/data/profiles";

    /**
     * Obtiene conductores activos de una flota específica.
     * Misión: Asegurar que el despachador solo vea su cooperativa.
     */
    async getDriversByFleet(fleetId) {
        // 🛡️ Guarda de Seguridad (Anti-Undefined) pre-procesamiento
        if (!fleetId || fleetId === 'undefined' || fleetId === 'null') {
            console.error("❌ [CIMCO-CORE] Error de Integridad: fleetId nulo o inválido interceptado antes de consultar BD.");
            throw new Error("Se requiere un ID de cooperativa válido para cargar la flota.");
        }

        try {
            const snapshot = await db.collection(this.#basePath)
                .where('fleetId', '==', fleetId)
                .where('status', '==', 'ACTIVE')
                .where('role', 'in', ['intermunicipal', 'motocarga']) // Extendible a otros roles
                .get();

            if (snapshot.empty) {
                return [];
            }

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
        // 🛡️ Guarda de Seguridad
        if (!uid || !data) {
             throw new Error("Datos de perfil corruptos o incompletos.");
        }

        try {
            const profileRef = db.doc(`${this.#basePath}/${uid}`);
            const newProfile = {
                uid,
                fullName: data.fullName || 'Usuario Sin Nombre',
                email: data.email || 'Sin correo registrado',
                role: data.role || 'user',
                fleetId: data.fleetId || 'GENERAL', // 'GENERAL' para independientes
                status: 'PENDING_APPROVAL',
                walletBalance: 0,
                // Regla de Negocio Protegida Intacta (Atomic Fusion)
                feePerService: data.role === 'motocarga' ? 500 : 0, 
                createdAt: new Date().toISOString()
            };

            await profileRef.set(newProfile, { merge: true });
            return { success: true, profile: newProfile };
        } catch (error) {
            console.error(`❌ Error inicializando perfil: ${error.message}`);
            throw error;
        }
    }
}

export default new ProfileService();