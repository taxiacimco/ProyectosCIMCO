/**
 * modules/auth/controllers/auth.controller.js
 * Controlador maestro de Identidad y RBAC - TAXIA CIMCO
 * * Misión: Gestión quirúrgica de perfiles y sincronización con el Path Sagrado.
 */
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { asyncHandler } from '../../../middleware/async-handler.js';

// ✅ CORRECCIÓN QUIRÚRGICA: 
// Se cambia a importación por defecto para evitar SyntaxError por falta de exportaciones nombradas.
import HttpResponse from '../../../utils/http-response.js';

/**
 * @route POST /auth/login
 * @desc Verifica el token de Firebase Auth y gestiona el perfil en Firestore
 * @access Public
 */
export const loginController = asyncHandler(async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return HttpResponse.error(res, 'No se proporcionó el token de autenticación (idToken).', 400);
    }

    // 1. Validar el Token con Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // 2. Sincronizar con Firestore (Sacred Data Structure Path)
    const db = getFirestore();
    const userRef = db.collection('artifacts').doc('taxiacimco-app')
                      .collection('public').doc('data')
                      .collection('usuarios').doc(uid);
    
    const userDoc = await userRef.get();

    let userData = {
        uid,
        email,
        displayName: name || email.split('@')[0],
        photoURL: picture || null,
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (!userDoc.exists) {
        /** * Fusión Atómica: Registro de Nuevo Usuario 
         * Se inicializa con rol 'passenger' y billetera en cero.
         */
        userData.role = 'passenger'; 
        userData.createdAt = new Date().toISOString();
        userData.status = 'active';
        userData.saldoWallet = 0; // Infraestructura de Pagos TAXIA CIMCO
        
        await userRef.set(userData);
        console.log(`✨ [Auth] Nuevo usuario registrado en la infraestructura: ${uid}`);
    } else {
        /**
         * Fusión Atómica: Usuario Existente
         * Solo actualizamos marcas de tiempo para no sobreescribir Custom Claims manuales.
         */
        await userRef.update({ 
            lastLogin: userData.lastLogin,
            updatedAt: userData.updatedAt
        });
        userData = { ...userDoc.data(), ...userData };
        console.log(`🔑 [Auth] Usuario re-autenticado: ${uid}`);
    }

    // 3. Respuesta Estandarizada mediante la utilidad centralizada
    return HttpResponse.ok(res, userData, 'Autenticación exitosa');
});

// Agrupamos en un objeto para exportación limpia (ESM)
export default {
    loginController
};