// Versión Arquitectura: V16.2 - Sincronización Radial Homologada
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useGpsGuard.js
 * Misión: Centinela Perimetral de Rutas con control de ráfagas para Sockets.
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext'; 
import { useLocation } from './useLocation';   

export const useGpsGuard = (maxAccuracyThreshold = 50) => {
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [coordenadasPasajero, setCoordenadasPasajero] = useState(null);
  const { socket, isConnected } = useSocket();
  
  // ⏱️ Guarda de tiempo para mitigar inundación de eventos en el Socket Network
  const ultimoReporteRef = useRef(0);
  const INTERVALO_MINIMO_REPORTE = 3000; // 3 segundos

  // 1. Instanciar el flujo continuo del chip GPS
  const { coordenadas, error, permisoDenegado } = useLocation(maxAccuracyThreshold);

  // 🛡️ Efecto A: Sincronización del Stream de Coordenadas y Emisión al Radar por Sockets
  useEffect(() => {
    if (coordenadas) {
      const { lat, lng, accuracy } = coordenadas;

      setCoordenadasPasajero({ lat, lng });
      setShowGpsModal(false); 

      // 🚀 EMISIÓN RADAR CONTROLADA: Validar ventana de tiempo antes de transmitir por red
      const ahora = Date.now();
      if (ahora - ultimoReporteRef.current >= INTERVALO_MINIMO_REPORTE) {
        if (isConnected && socket) {
          // ⚡ HOMOLOGACIÓN DE EVENTO: Se utiliza 'actualizar_ubicacion' para guardar coherencia con useTelemetryThrottle
          socket.emit('actualizar_ubicacion', { 
            latitud: lat, 
            longitud: lng, 
            lat,
            lng,
            accuracy, 
            timestamp: ahora,
            updatedAt: new Date().toISOString()
          });
          
          ultimoReporteRef.current = ahora;
        }
      }
    }
  }, [coordenadas, isConnected, socket]);

  // 🚨 Efecto B: Gestión Reactiva Defensiva ante Errores y Revocación de Permisos
  useEffect(() => {
    if (permisoDenegado || error) {
      setShowGpsModal(true); 
    }
  }, [permisoDenegado, error]);

  // 🔄 Función de Compatibilidad para la UI
  const verificarGps = () => {
    console.log("📡 [CIMCO-GPS-GUARD] Re-evaluación del estado del sensor solicitada por la UI.");
    if (permisoDenegado || error) {
      setShowGpsModal(true);
    } else if (coordenadas) {
      setShowGpsModal(false);
    }
  };

  return { showGpsModal, coordenadasPasajero, verificarGps };
};