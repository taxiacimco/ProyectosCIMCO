package com.cimco.api.model;

import com.google.cloud.firestore.annotation.DocumentId;
import com.google.cloud.firestore.annotation.PropertyName;
import java.util.Date;

/**
 * Representa un viaje (ride) en el sistema CIMCO.
 * Optimizado para el mapeo con la colección "rides" de Firestore.
 */
public class Viaje {

    @DocumentId
    private String id;
    
    @PropertyName("conductor_id")
    private String conductorId;
    
    @PropertyName("pasajero_id")
    private String pasajeroId;
    
    @PropertyName("conductor_nombre")
    private String conductorNombre;
    
    @PropertyName("pasajero_nombre")
    private String pasajeroNombre;
    
    private Double tarifa;
    
    @PropertyName("comision_cimco")
    private Double comisionCimco;
    
    @PropertyName("metodo_pago")
    private String metodoPago; // "EFECTIVO", "WALLET", "TARJETA"
    
    private String status; // "COMPLETADO", "CANCELADO", "EN_CURSO", "SOLICITADO"
    
    private String origen;
    private String destino;
    
    @PropertyName("fecha_registro")
    private Date fechaRegistro;
    
    @PropertyName("fecha_finalizacion")
    private Date fechaFinalizacion;

    /**
     * Constructor vacío requerido por Firestore para la deserialización.
     */
    public Viaje() {}

    /**
     * Constructor completo.
     */
    public Viaje(String id, String conductorId, String pasajeroId, String conductorNombre, 
                 String pasajeroNombre, Double tarifa, Double comisionCimco, String metodoPago, 
                 String status, String origen, String destino, Date fechaRegistro) {
        this.id = id;
        this.conductorId = conductorId;
        this.pasajeroId = pasajeroId;
        this.conductorNombre = conductorNombre;
        this.pasajeroNombre = pasajeroNombre;
        this.tarifa = tarifa;
        this.comisionCimco = comisionCimco;
        this.metodoPago = metodoPago;
        this.status = status;
        this.origen = origen;
        this.destino = destino;
        this.fechaRegistro = fechaRegistro;
    }

    // --- Getters y Setters con anotaciones PropertyName para coherencia en Firestore ---

    @DocumentId
    public String getId() { return id; }
    
    @DocumentId
    public void setId(String id) { this.id = id; }

    @PropertyName("conductor_id")
    public String getConductorId() { return conductorId; }
    
    @PropertyName("conductor_id")
    public void setConductorId(String conductorId) { this.conductorId = conductorId; }

    @PropertyName("pasajero_id")
    public String getPasajeroId() { return pasajeroId; }
    
    @PropertyName("pasajero_id")
    public void setPasajeroId(String pasajeroId) { this.pasajeroId = pasajeroId; }

    @PropertyName("conductor_nombre")
    public String getConductorNombre() { return conductorNombre; }
    
    @PropertyName("conductor_nombre")
    public void setConductorNombre(String conductorNombre) { this.conductorNombre = conductorNombre; }

    @PropertyName("pasajero_nombre")
    public String getPasajeroNombre() { return pasajeroNombre; }
    
    @PropertyName("pasajero_nombre")
    public void setPasajeroNombre(String pasajeroNombre) { this.pasajeroNombre = pasajeroNombre; }

    public Double getTarifa() { return tarifa; }
    public void setTarifa(Double tarifa) { this.tarifa = tarifa; }

    @PropertyName("comision_cimco")
    public Double getComisionCimco() { return comisionCimco; }
    
    @PropertyName("comision_cimco")
    public void setComisionCimco(Double comisionCimco) { this.comisionCimco = comisionCimco; }

    @PropertyName("metodo_pago")
    public String getMetodoPago() { return metodoPago; }
    
    @PropertyName("metodo_pago")
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    @PropertyName("fecha_registro")
    public Date getFechaRegistro() { return fechaRegistro; }
    
    @PropertyName("fecha_registro")
    public void setFechaRegistro(Date fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    @PropertyName("fecha_finalizacion")
    public Date getFechaFinalizacion() { return fechaFinalizacion; }
    
    @PropertyName("fecha_finalizacion")
    public void setFechaFinalizacion(Date fechaFinalizacion) { this.fechaFinalizacion = fechaFinalizacion; }

    @Override
    public String toString() {
        return "Viaje{" +
                "id='" + id + '\'' +
                ", conductor='" + conductorNombre + '\'' +
                ", tarifa=" + tarifa +
                ", metodo='" + metodoPago + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}