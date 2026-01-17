package com.cimco.api.model;

import com.google.cloud.firestore.annotation.IgnoreExtraProperties;
import com.google.cloud.firestore.annotation.PropertyName;

/**
 * Representa a un conductor en el sistema CIMCO.
 * La anotación IgnoreExtraProperties evita errores si Firestore tiene campos 
 * adicionales que no hemos definido aquí.
 */
@IgnoreExtraProperties
public class Conductor {

    private String id;
    private String nombre;
    private String apellido;
    private String telefono;
    private String placaVehiculo;
    private String estado; // Ejemplo: "ACTIVO", "INACTIVO", "EN_VIAJE"
    private double calificacion;
    private boolean verificado;

    public Conductor() {
        // Constructor vacío requerido por Firestore
    }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    @PropertyName("placa_vehiculo")
    public String getPlacaVehiculo() { return placaVehiculo; }
    
    @PropertyName("placa_vehiculo")
    public void setPlacaVehiculo(String placaVehiculo) { this.placaVehiculo = placaVehiculo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public double getCalificacion() { return calificacion; }
    public void setCalificacion(double calificacion) { this.calificacion = calificacion; }

    public boolean isVerificado() { return verificado; }
    public void setVerificado(boolean verificado) { this.verificado = verificado; }
}