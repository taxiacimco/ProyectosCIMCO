// Versión Arquitectura: V1.2 - Unificación de Emisión de Eventos de Seguimiento de Telemetría Core
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useTelemetryThrottle.js
 * Misión: Limitar la velocidad de actualización de coordenadas para mitigar lag en la UI y sincronizar las transmisiones en tiempo real.
 * Ajuste V1.2: Redirección del canal de transmisión de telemetría hacia el estándar unificado del socket manager, eliminando eventos redundantes y aplicando guardas estrictas.
 */

import { useState, useRef, useEffect } from 'react';

export const useTelemetryThrottle = (delay = 1500) => {
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

      // Estructuración limpia del reporte de geolocalización con fallback estructural
      const saneadoPayload = {
        latitud: payload?.latitud || payload?.lat || 0,
        longitud: payload?.longitud || payload?.lng || 0,
        velocidad: payload?.velocidad || 0,
        cooperativa: payload?.cooperativa || 'Particular',
        empresa: payload?.empresa || 'Particular'
      };

      setThrottledData(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...saneadoPayload,
          ultimoReporte: new Date(timestamp)
        }
      }));
      
      lastUpdated.current[id] = timestamp;

      // ESTRATEGIA DE EMISIÓN DE EVENTO UNIFICADO AL BACKEND VIA WEBSOCKET (SOCKET.IO CORE)
      // Se utiliza el canal integrado estándar deprecando llamadas redundantes
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