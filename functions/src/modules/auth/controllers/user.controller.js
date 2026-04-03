/**
 * modules/auth/controllers/user.controller.js
 * Gestión de perfil de usuario
 */
import { getFirestore } from 'firebase-admin/firestore';
import { asyncHandler } from '../../../middleware/async-handler.js';
import { sendSuccessResponse, sendErrorResponse } from '../../../utils/http-response.js';

export const updateProfile = asyncHandler(async (req, res) => {
    const { uid } = req.user; // Obtenido del authMiddleware
    const { displayName, photoURL, phone } = req.body;

    const db = getFirestore();
    const userRef = db.collection('artifacts')
                      .doc('taxiacimco-app')
                      .collection('public')
                      .doc('data')
                      .collection('usuarios')
                      .doc(uid);

    const updateData = {
        updatedAt: new Date().toISOString()
    };

    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (phone) updateData.phone = phone;

    await userRef.update(updateData);

    return sendSuccessResponse(res, updateData, "Perfil actualizado correctamente");
});

export default { updateProfile };