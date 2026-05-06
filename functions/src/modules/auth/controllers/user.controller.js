// Versión Arquitectura: V8.0 - Registro con Lógica de Despacho Híbrida
/**
 * functions/src/modules/auth/controllers/user.controller.js
 * PROYECTO: TAXIA CIMCO
 * MISIÓN: Gestión de perfil con lógica de despacho segregada por tipo de servicio.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { asyncHandler } from '../../../middleware/async-handler.js';
import { sendSuccessResponse, sendErrorResponse } from '../../../utils/http-response.js';

export const registrar = asyncHandler(async (req, res) => {
    const { 
        email, nombre, password, telefono, cedula, rol, 
        placa, numeroInterno, cooperativa, serviceType, uid: customUid 
    } = req.body;

    if (!email || !cedula) {
        return sendErrorResponse(res, "Email y Cédula son campos obligatorios para el registro.", 400);
    }

    const db = getFirestore();
    const uid = customUid || `user_${Date.now()}`;

    const userRef = db.collection('artifacts')
                      .doc('taxiacimco-app')
                      .collection('public')
                      .doc('data')
                      .collection('usuarios')
                      .doc(uid);

    const userDoc = await userRef.get();
    if (userDoc.exists) {
        return sendErrorResponse(res, "El usuario ya se encuentra registrado en el sistema.", 409);
    }

    /**
     * 🧠 LÓGICA DE DESPACHO CIMCO:
     * Si es intermunicipal, el despacho es 'managed' (por despachador).
     * Si es moto (taxi, parrilla, carga), el despacho es 'direct' (al celular).
     */
    const isIntermunicipal = serviceType === 'intermunicipal';
    const dispatchMode = isIntermunicipal ? 'managed' : 'direct';

    const newUser = {
        uid,
        email,
        displayName: nombre || email.split('@')[0],
        phone: telefono || null,
        cedula: cedula,
        role: rol || 'conductor',
        status: 'active',
        
        // 🚖 SEGREGACIÓN DE SERVICIO
        serviceType: serviceType || 'mototaxi',
        dispatchMode: dispatchMode,
        
        // Datos de Vehículo
        placa: placa || null,
        numeroInterno: numeroInterno || null,
        cooperativa: cooperativa || (isIntermunicipal ? 'PENDIENTE' : 'N/A'),

        // 📍 GEO-UBICACIÓN (Preparación para Geohashing 5km)
        lastLocation: {
            lat: 0,
            lng: 0,
            geohash: "",
            updatedAt: new Date().toISOString()
        },

        // 💰 FINANZAS - Inicialización Atómica
        saldoWallet: 0,
        wallet_balance: 0,
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await userRef.set(newUser);
    return sendSuccessResponse(res, newUser, `Conductor registrado como ${serviceType} (${dispatchMode})`, 201);
});

export const updateProfile = asyncHandler(async (req, res) => {
    const { uid } = req.user; 
    const { displayName, photoURL, phone } = req.body;

    const db = getFirestore();
    const userRef = db.collection('artifacts/taxiacimco-app/public/data/usuarios').doc(uid);

    const updateData = { updatedAt: new Date().toISOString() };
    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (phone) updateData.phone = phone;

    await userRef.update(updateData);
    return sendSuccessResponse(res, updateData, "Perfil actualizado correctamente");
});

export const registrarPasajero = asyncHandler(async (req, res) => {
    const uid = req.user?.uid || req.body.uid; 
    const { email, displayName, phone, photoURL } = req.body;

    if (!uid || !email) return sendErrorResponse(res, "UID y Email son críticos.", 400);

    const db = getFirestore();
    const userRef = db.collection('artifacts/taxiacimco-app/public/data/usuarios').doc(uid);

    const userDoc = await userRef.get();
    if (userDoc.exists) return sendErrorResponse(res, "El pasajero ya existe.", 409);

    const newPassenger = {
        uid, email,
        displayName: displayName || email.split('@')[0],
        phone, photoURL,
        role: 'pasajero',
        status: 'active',
        saldoWallet: 0,
        wallet_balance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await userRef.set(newPassenger);
    return sendSuccessResponse(res, newPassenger, "Pasajero registrado correctamente.", 201);
});

export default { registrar, updateProfile, registrarPasajero };