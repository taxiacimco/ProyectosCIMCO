package com.cimco.api.model;

/**
 * DTO para enviar las estadísticas globales al Dashboard de CIMCO.
 * No se guarda directamente en Firestore como una colección, 
 * sino que es el resultado de procesar los datos.
 */
public class MetricasResumen {

    private long totalConductores;
    private long conductoresActivos;
    private long totalViajesHoy;
    private double ingresosTotales;
    private double porcentajeCrecimiento;

    public MetricasResumen() {}

    public MetricasResumen(long totalConductores, long conductoresActivos, long totalViajesHoy, double ingresosTotales) {
        this.totalConductores = totalConductores;
        this.conductoresActivos = conductoresActivos;
        this.totalViajesHoy = totalViajesHoy;
        this.ingresosTotales = ingresosTotales;
    }

    // Getters y Setters
    public long getTotalConductores() { return totalConductores; }
    public void setTotalConductores(long totalConductores) { this.totalConductores = totalConductores; }

    public long getConductoresActivos() { return conductoresActivos; }
    public void setConductoresActivos(long conductoresActivos) { this.conductoresActivos = conductoresActivos; }

    public long getTotalViajesHoy() { return totalViajesHoy; }
    public void setTotalViajesHoy(long totalViajesHoy) { this.totalViajesHoy = totalViajesHoy; }

    public double getIngresosTotales() { return ingresosTotales; }
    public void setIngresosTotales(double ingresosTotales) { this.ingresosTotales = ingresosTotales; }

    public double getPorcentajeCrecimiento() { return porcentajeCrecimiento; }
    public void setPorcentajeCrecimiento(double porcentajeCrecimiento) { this.porcentajeCrecimiento = porcentajeCrecimiento; }
}