package com.cimco.api.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.stereotype.Service;

/**
 * Servicio encargado de validar la identidad de los usuarios
 * mediante los tokens de Firebase Auth.
 */
@Service
public class AuthService {

    /**
     * Valida un token ID de Firebase.
     * @param idToken El token JWT enviado desde el frontend/cliente.
     * @return El UID del usuario si el token es válido.
     * @throws Exception Si el token es inválido o ha expirado.
     */
    public String validarToken(String idToken) throws Exception {
        try {
            // Firebase Admin SDK verifica la firma y la vigencia del token
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);
            String uid = decodedToken.getUid();
            
            System.out.println("🔐 Token validado correctamente para UID: " + uid);
            return uid;
        } catch (Exception e) {
            System.err.println("🚫 Error de Autenticación: " + e.getMessage());
            throw new Exception("Token de seguridad inválido o expirado.");
        }
    }
}