// Versión Arquitectura: V1.3 - Amortiguación Táctica de Telemetría y Suavizado Visual
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useTelemetryThrottle.js
 * Misión: Limitar la velocidad de actualización de coordenadas para mitigar lag en la UI y sincronizar las transmisiones en tiempo real.
 * Ajuste V1.3: Calibración de delay a 2000ms, preservación de datos de rumbo (bearing/heading) y saneamiento doble de llaves geográficas.
 */

import { useState, useRef, useEffect } from 'react';

export const useTelemetryThrottle = (delay = 2000) => {
  const [throttledData, setThrottledData] = useState({});
  const lastUpdated = useRef({});
  const timeoutRefs = useRef({});
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Limpieza exhaustiva de colas de timeouts para prevenir memory leaks en caliente
      if (timeoutRefs.current) {
        Object.values(timeoutRefs.current).forEach(clearTimeout);
      }
    };
  }, []);

  const updateCoordinates = (vehiculoId, telemetryPayload, socketInstance = null) => {
    // BLINDAJE DE VARIABLES (ANTI-UNDEFINED): Validación estricta del ID del vehículo e integridad del payload
    if (!vehiculoId || !telemetryPayload || !isMounted.current) return;

    const now = Date.now();
    const lastTime = lastUpdated.current[vehiculoId] || 0;

    const ejecutarActualizacion = (id, payload, timestamp) => {
      if (!isMounted.current) return;

      const lat = Number(payload?.latitud || payload?.lat || 0);
      const lng = Number(payload?.longitud || payload?.lng || 0);

      // Estructuración limpia del reporte de geolocalización con fallback estructural y soporte de rumbo
      const saneadoPayload = {
        latitud: lat,
        longitud: lng,
        lat: lat,
        lng: lng,
        velocidad: Number(payload?.velocidad || payload?.speed || 0),
        bearing: Number(payload?.bearing || payload?.heading || 0),
        heading: Number(payload?.heading || payload?.bearing || 0),
        accuracy: Number(payload?.accuracy || 0),
        cooperativa: payload?.cooperativa || 'Particular',
        empresa: payload?.empresa || 'Particular'
      };

      setThrottledData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...saneadoPayload,
          ultimoReporte: new Date(timestamp),
          updatedAt: new Date(timestamp).toISOString()
        }
      }));
      
      lastUpdated.current[id] = timestamp;

      // ESTRATEGIA DE EMISIÓN DE EVENTO UNIFICADO AL BACKEND VIA WEBSOCKET (SOCKET.IO CORE)
      if (socketInstance && typeof socketInstance.emit === 'function') {
        socketInstance.emit('actualizar_ubicacion', {
          vehiculoId: String(id),
          ...saneadoPayload,
          timestamp: timestamp
        });
      }
    };

    if (now - lastTime >= delay) {
      // Ventana de tiempo cumplida: Ejecución y mutación inmediata del estado en UI y backend
      if (timeoutRefs.current[vehiculoId]) {
        clearTimeout(timeoutRefs.current[vehiculoId]);
        delete timeoutRefs.current[vehiculoId];
      }
      ejecutarActualizacion(vehiculoId, telemetryPayload, now);
    } else {
      // Ráfaga muy rápida: Re-encolar y aplazar la última coordenada conocida para balancear carga de red
      if (timeoutRefs.current[vehiculoId]) {
        clearTimeout(timeoutRefs.current[vehiculoId]);
      }

      const tiempoRestante = delay - (now - lastTime);
      timeoutRefs.current[vehiculoId] = setTimeout(() => {
        ejecutarActualizacion(vehiculoId, telemetryPayload, Date.now());
        delete timeoutRefs.current[vehiculoId];
      }, tiempoRestante);
    }
  };

  return [throttledData, updateCoordinates];
};