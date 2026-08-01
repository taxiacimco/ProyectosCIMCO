// Versión Arquitectura: V16.3 - Sincronización Radial Homologada y Adaptativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useGpsGuard.js
 * Misión: Centinela Perimetral de Rutas con control de ráfagas para Sockets.
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext'; 
import { useLocation } from './useLocation';   

export const useGpsGuard = (maxAccuracyThreshold = 1500) => {
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [coordenadasPasajero, setCoordenadasPasajero] = useState(null);
  const { socket, isConnected } = useSocket();
  
  const ultimoReporteRef = useRef(0);
  const INTERVALO_MINIMO_REPORTE = 3000; // 3 segundos

  const { coordenadas, error, permisoDenegado } = useLocation(maxAccuracyThreshold);

  useEffect(() => {
    if (coordenadas) {
      const { lat, lng, accuracy } = coordenadas;

      setCoordenadasPasajero({ lat, lng });
      setShowGpsModal(false); 

      const ahora = Date.now();
      if (ahora - ultimoReporteRef.current >= INTERVALO_MINIMO_REPORTE) {
        if (isConnected && socket) {
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

  useEffect(() => {
    if (permisoDenegado || error) {
      setShowGpsModal(true); 
    }
  }, [permisoDenegado, error]);

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