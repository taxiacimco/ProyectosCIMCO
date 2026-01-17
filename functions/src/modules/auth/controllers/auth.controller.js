import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Verifica el token de Firebase Auth y gestiona el perfil en Firestore
 */
export const loginController = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ 
            success: false, 
            message: 'No se proporcionó el token de autenticación (idToken).' 
        });
    }

    try {
        // 1. Validar el Token con Firebase Admin SDK
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const { uid, email, name, picture } = decodedToken;

        // 2. Sincronizar con Firestore (Colección users)
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);
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
            // Usuario Nuevo: Asignar rol por defecto
            userData.role = 'passenger'; 
            userData.createdAt = new Date().toISOString();
            userData.status = 'active';
            await userRef.set(userData);
            console.log(`[Auth] Nuevo usuario creado: ${uid}`);
        } else {
            // Usuario Existente: Solo actualizar última conexión
            await userRef.update({ 
                lastLogin: userData.lastLogin,
                updatedAt: userData.updatedAt
            });
            userData = { ...userDoc.data(), ...userData };
            console.log(`[Auth] Usuario re-autenticado: ${uid}`);
        }

        // 3. Responder al Frontend con los datos y el rol (RBAC)
        return res.status(200).json({
            success: true,
            message: 'Autenticación exitosa',
            user: userData
        });

    } catch (error) {
        console.error('Error en loginController:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Token inválido o sesión expirada.' 
        });
    }
};