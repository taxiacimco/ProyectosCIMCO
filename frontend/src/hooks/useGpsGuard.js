// Versión Arquitectura: V16.1 - Sincronización Radial con Control de Inundación (Throttling Telemetría)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useGpsGuard.js
 * Misión: Centinela Perimetral de Rutas con control de ráfagas para Sockets.
 * Ajuste V16.1: Inyección de un filtro de tiempo (Throttling) para limitar emisiones de red a un máximo de 3 segundos.
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
  const INTERVALO_MINIMO_REPORTE = 3000; // 3 segundos (Tiempo óptimo para tracking urbano)

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
          socket.emit('actualizar_radar_gps', { 
            lat, 
            lng, 
            accuracy, 
            updatedAt: new Date().toISOString()
          });
          
          // Actualizar la estampa de tiempo del último paquete enviado con éxito
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