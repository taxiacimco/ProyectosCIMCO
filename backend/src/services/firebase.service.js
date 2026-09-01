// Versión Arquitectura: V5.0 - Sincronización Real de Usuarios y Billeteras con Firebase Admin SDK
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\services\firebase.service.js
 * Misión: Centralizar los eventos de réplica y sincronización de usuarios (Auth / Firestore) 
 *          y billeteras con la SDK de Firebase Admin, eliminando los stubs dummy y asegurando
 *          sincronización bidireccional limpia con guardas anti-undefined.
 */

import admin from 'firebase-admin';
import { db, FIRESTORE_PATHS } from '../config/firebase.js';

/**
 * Sincroniza o crea la cuenta en Firebase Authentication.
 * @param {Object} data Datos del usuario (uid, email, password, nombre, etc.)
 */
export const syncAuthUser = async (data) => {
    if (!data) return null;

    const uidTarget = String(data.uid || data._id || data.id || '').trim();
    const emailTarget = (data.email || data.correo || '').toString().trim();
    const displayName = (data.nombre || data.fullName || data.nombreCompleto || '').toString().trim();

    if (!uidTarget && !emailTarget) {
        console.warn("⚠️ [CIMCO-FIREBASE-SERVICE]syncAuthUser cancelado: Se requiere UID o Email.");
        return null;
    }

    try {
        let authUser = null;

        if (uidTarget) {
            try {
                authUser = await admin.auth().getUser(uidTarget);
            } catch (fetchErr) {
                if (fetchErr.code !== 'auth/user-not-found') throw fetchErr;
            }
        }

        if (!authUser && emailTarget) {
            try {
                authUser = await admin.auth().getUserByEmail(emailTarget);
            } catch (fetchErr) {
                if (fetchErr.code !== 'auth/user-not-found') throw fetchErr;
            }
        }

        const updateData = {};
        if (emailTarget) updateData.email = emailTarget;
        if (displayName) updateData.displayName = displayName;
        if (data.telefono || data.telefonoMovil) updateData.phoneNumber = data.telefono || data.telefonoMovil;
        if (data.foto_perfil) updateData.photoURL = data.foto_perfil;
        if (data.disabled !== undefined) updateData.disabled = Boolean(data.disabled);

        if (authUser) {
            // Actualización de cuenta existente en Firebase Auth
            if (Object.keys(updateData).length > 0) {
                authUser = await admin.auth().update(authUser.uid, updateData);
            }
            return authUser;
        } else {
            // Creación de nueva cuenta en Firebase Auth
            const createPayload = {
                uid: uidTarget || undefined,
                email: emailTarget,
                displayName: displayName || 'Usuario TAXIA',
                password: data.password || `Cimco_${Date.now()}`,
                disabled: false,
                ...updateData
            };
            authUser = await admin.auth().createUser(createPayload);
            return authUser;
        }
    } catch (error) {
        console.error("🚨 [CIMCO-FIREBASE-SERVICE] Error en syncAuthUser:", error.message);
        return null;
    }
};

/**
 * Crea o sobreescribe la ficha del usuario en las colecciones de Firestore correspondiente.
 * @param {string} uid UID único del usuario
 * @param {Object} data Payload de datos a registrar
 * @param {boolean} esPasajero Identificador de rol Pasajero
 * @param {boolean} esConductor Identificador de rol Conductor
 */
export const syncFirestoreUser = async (uid, data, esPasajero = false, esConductor = false) => {
    if (!uid || !data) return null;

    try {
        const targetUid = String(uid).trim();
        const batch = db.batch();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        const basePayload = {
            uid: targetUid,
            nombre: data.nombre || data.fullName || '',
            email: data.email || data.correo || '',
            rol: (data.rol || data.role || 'pasajero').toLowerCase(),
            telefono: data.telefono || data.telefonoMovil || '',
            foto_perfil: data.foto_perfil || '',
            activo: data.activo !== undefined ? Boolean(data.activo) : true,
            updatedAt: timestamp
        };

        // 1. Réplica en colección principal de usuarios
        const userCol = FIRESTORE_PATHS?.users || FIRESTORE_PATHS?.usuarios || 'usuarios';
        const userRef = db.collection(userCol).doc(targetUid);
        batch.set(userRef, { ...basePayload, createdAt: timestamp }, { merge: true });

        // 2. Réplica condicional en colección especializada de conductores
        if (esConductor || basePayload.rol === 'conductor' || basePayload.rol === 'mototaxi') {
            const conductorCol = FIRESTORE_PATHS?.conductores || 'conductores_activos';
            const conductorRef = db.collection(conductorCol).doc(targetUid);
            const conductorPayload = {
                ...basePayload,
                placa: data.placa || data.vehiculo?.placa || '',
                tipoVehiculo: data.tipoVehiculo || data.subrol || 'mototaxi',
                estadoConductor: data.estadoConductor || 'DISPONIBLE',
                ubicacion: data.ubicacion || null
            };
            batch.set(conductorRef, conductorPayload, { merge: true });
        }

        await batch.commit();
        return { success: true, uid: targetUid };
    } catch (error) {
        console.error("🚨 [CIMCO-FIREBASE-SERVICE] Error en syncFirestoreUser:", error.message);
        return null;
    }
};

/**
 * Sincroniza la billetera digital y el saldo actual en Firestore.
 * @param {string} uid UID único del usuario/billetera
 * @param {Object} data Contiene el saldo, moneda y estado de la billetera
 */
export const syncFirestoreWallet = async (uid, data) => {
    if (!uid || !data) return null;

    try {
        const targetUid = String(uid).trim();
        const walletCol = FIRESTORE_PATHS?.wallets || 'billeteras';
        const walletRef = db.collection(walletCol).doc(targetUid);

        const walletPayload = {
            uid: targetUid,
            idUsuario: targetUid,
            saldo: Number(data.saldo !== undefined ? data.saldo : (data.saldoActual || 0)),
            moneda: data.moneda || 'COP',
            estado: data.estado || 'ACTIVA',
            ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };

        await walletRef.set(walletPayload, { merge: true });
        return walletPayload;
    } catch (error) {
        console.error("🚨 [CIMCO-FIREBASE-SERVICE] Error en syncFirestoreWallet:", error.message);
        return null;
    }
};

/**
 * Actualiza parcialmente los campos de un usuario en Firestore sin destruir datos existentes.
 * @param {string} uid UID único del usuario
 * @param {Object} data Atributos a modificar
 * @param {boolean} esPasajero Identificador de rol Pasajero
 * @param {boolean} esConductor Identificador de rol Conductor
 */
export const updateFirestoreUser = async (uid, data, esPasajero = false, esConductor = false) => {
    if (!uid || !data) return null;

    try {
        const targetUid = String(uid).trim();
        const batch = db.batch();

        const updatePayload = {
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Eliminar valores undefined para evitar errores de Firestore SDK
        Object.keys(updatePayload).forEach(key => {
            if (updatePayload[key] === undefined) {
                delete updatePayload[key];
            }
        });

        // 1. Actualización en colección principal de usuarios
        const userCol = FIRESTORE_PATHS?.users || FIRESTORE_PATHS?.usuarios || 'usuarios';
        const userRef = db.collection(userCol).doc(targetUid);
        batch.update(userRef, updatePayload);

        // 2. Actualización en colección de conductores si corresponde
        if (esConductor || data.rol === 'conductor' || data.rol === 'mototaxi') {
            const conductorCol = FIRESTORE_PATHS?.conductores || 'conductores_activos';
            const conductorRef = db.collection(conductorCol).doc(targetUid);
            batch.set(conductorRef, updatePayload, { merge: true });
        }

        await batch.commit();
        return { success: true, uid: targetUid };
    } catch (error) {
        console.error("🚨 [CIMCO-FIREBASE-SERVICE] Error en updateFirestoreUser:", error.message);
        return null;
    }
};

export default {
    syncAuthUser,
    syncFirestoreUser,
    syncFirestoreWallet,
    updateFirestoreUser
};