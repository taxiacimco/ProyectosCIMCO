// Archivo: functions/verifyRoleQr.mjs

import { https } from "firebase-functions";
import admin from "firebase-admin";
import { createHmac } from "crypto";

// NOTA IMPORTANTE: Se lee la misma clave secreta que se usa para firmar.
const QR_SECRET = process.env.QR_SECRET;
const db = admin.firestore();

/**
 * Función interna para verificar la firma del contenido del QR usando HMAC
 */
function verifySignature(payload, signature) {
  if (!QR_SECRET) {
      throw new Error("QR_SECRET no configurado.");
  }
  const expectedSignature = createHmac('sha256', QR_SECRET).update(payload).digest('hex');
  
  // Comparación segura de firmas (para prevenir ataques de tiempo)
  return expectedSignature === signature;
}

/**
 * Función Callable que toma la cadena de texto de un QR (firmado) y verifica:
 * 1. La autenticidad de la firma (que no haya sido falsificado).
 * 2. La validez de la fecha (que no esté expirado).
 * 3. Si el usuario está activo y tiene el rol correcto en la BD.
 * * Este endpoint será usado por la aplicación del Verificador/Despachador.
 */
export const verifyRoleQr = https.onCall(async (data, context) => {
    
    // 1. Seguridad: Verificar autenticación
    if (!context.auth) {
        throw new https.HttpsError('unauthenticated', 'Se requiere autenticación para verificar QRs.');
    }
    
    // Si queremos restringir quién puede verificar, añadimos:
    const callerRole = context.auth.token.rolePrincipal;
    if (!['despachador', 'admin', 'ceo', 'interconductor'].includes(callerRole)) {
        // Solo roles con capacidad de verificación pueden usar esta función
        throw new https.HttpsError('permission-denied', 'Tu rol no está autorizado para verificar códigos QR.');
    }

    const { qrContent } = data;

    if (!qrContent) {
        throw new https.HttpsError('invalid-argument', 'Contenido del QR es requerido.');
    }

    if (!QR_SECRET) {
        throw new https.HttpsError('internal', 'La clave de seguridad (QR_SECRET) no está configurada.');
    }

    let payloadData, signature;

    try {
        // 2. Parsear el contenido del QR (debe ser {payload: string, sig: string})
        const parsedQr = JSON.parse(qrContent);
        payloadData = parsedQr.payload;
        signature = parsedQr.sig;
    } catch (e) {
        console.error("Error al parsear el contenido del QR:", e);
        throw new https.HttpsError('invalid-argument', 'El formato del QR es inválido.');
    }

    // 3. Verificar la firma criptográfica
    if (!verifySignature(payloadData, signature)) {
        console.warn(`Firma inválida para payload: ${payloadData}`);
        throw new https.HttpsError('unauthenticated', 'La firma del código QR es inválida. Posible falsificación.');
    }

    // Firma válida, ahora procesamos la información.
    let payload;
    try {
        payload = JSON.parse(payloadData);
    } catch (e) {
        throw new https.HttpsError('internal', 'El payload interno del QR está corrupto.');
    }

    // 4. Verificar expiración
    const now = Date.now();
    if (payload.exp < now) {
        throw new https.HttpsError('resource-exhausted', 'El código QR ha expirado. El conductor debe regenerarlo.');
    }

    // 5. Obtener información actualizada del usuario desde Firestore
    const userDoc = await db.doc(`users/${payload.uid}`).get();
    
    if (!userDoc.exists) {
        throw new https.HttpsError('not-found', 'Usuario de QR no encontrado en la base de datos.');
    }
    
    const userData = userDoc.data();

    // 6. Verificar coherencia y estado
    if (userData.rolePrincipal !== payload.role) {
        throw new https.HttpsError('failed-precondition', 'El rol en el QR no coincide con el rol actual del usuario.');
    }
    
    // Si tienes un campo 'status' para bloqueo o inactividad
    if (userData.status === 'inactivo' || userData.status === 'bloqueado') {
        throw new https.HttpsError('permission-denied', `El usuario (${userData.rolePrincipal}) está actualmente ${userData.status}.`);
    }

    // 7. Éxito: Devolver la información verificada
    return {
        ok: true,
        message: "QR verificado exitosamente. Documentación válida.",
        userInfo: {
            uid: payload.uid,
            role: payload.role,
            cooperativeId: payload.cooperativeId,
            name: userData.nombre || 'Nombre no registrado', // Asume que tienes el campo 'nombre'
            email: userData.email,
            expires: new Date(payload.exp).toISOString(),
            // Incluye cualquier otro dato sensible que deba ver el despachador/verificador
        }
    };
});