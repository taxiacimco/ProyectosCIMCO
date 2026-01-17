package com.cimco.api.model;

import com.google.cloud.firestore.annotation.DocumentId;
import com.google.cloud.firestore.annotation.PropertyName;

/**
 * Modelo de Usuario optimizado para Firebase Firestore.
 * Incluye soporte para Wallet y Notificaciones Push (FCM).
 */
public class Usuario {
    
    @DocumentId
    private String id;
    
    private String nombre;
    private String email;
    private String telefono;
    private String rol; // "CONDUCTOR", "CLIENTE", "ADMIN"
    
    private Double saldoWallet; 

    // Nuevo campo para notificaciones push
    private String fcmToken; 

    /**
     * Constructor vacío requerido por Firestore para la deserialización.
     */
    public Usuario() {}

    /**
     * Constructor completo actualizado.
     */
    public Usuario(String id, String nombre, String email, String telefono, String rol, Double saldoWallet, String fcmToken) {
        this.id = id;
        this.nombre = nombre;
        this.email = email;
        this.telefono = telefono;
        this.rol = rol;
        this.saldoWallet = saldoWallet;
        this.fcmToken = fcmToken;
    }

    // --- Getters y Setters ---

    @DocumentId
    public String getId() { 
        return id; 
    }
    
    @DocumentId
    public void setId(String id) { 
        this.id = id; 
    }

    public String getNombre() { 
        return nombre; 
    }
    
    public void setNombre(String nombre) { 
        this.nombre = nombre; 
    }

    public String getEmail() { 
        return email; 
    }
    
    public void setEmail(String email) { 
        this.email = email; 
    }

    public String getTelefono() { 
        return telefono; 
    }
    
    public void setTelefono(String telefono) { 
        this.telefono = telefono; 
    }

    public String getRol() { 
        return rol; 
    }
    
    public void setRol(String rol) { 
        this.rol = rol; 
    }

    @PropertyName("saldo_wallet")
    public Double getSaldoWallet() { 
        return saldoWallet; 
    }

    @PropertyName("saldo_wallet")
    public void setSaldoWallet(Double saldoWallet) { 
        this.saldoWallet = saldoWallet; 
    }

    /**
     * Mapea el campo 'fcm_token' de Firestore a 'fcmToken' en Java.
     */
    @PropertyName("fcm_token")
    public String getFcmToken() {
        return fcmToken;
    }

    @PropertyName("fcm_token")
    public void setFcmToken(String fcmToken) {
        this.fcmToken = fcmToken;
    }

    @Override
    public String toString() {
        return "Usuario{" +
                "id='" + id + '\'' +
                ", nombre='" + nombre + '\'' +
                ", email='" + email + '\'' +
                ", rol='" + rol + '\'' +
                ", saldoWallet=" + (saldoWallet != null ? String.format("%.2f", saldoWallet) : "0.00") +
                ", fcmToken='" + (fcmToken != null ? "CONFIGURADO" : "PENDIENTE") + '\'' +
                '}';
    }
}