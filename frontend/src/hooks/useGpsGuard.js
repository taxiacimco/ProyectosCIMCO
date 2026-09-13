// Versión Arquitectura: V16.5 - Condicionar emisión de ubicación a connectionStatus CONNECTED
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useGpsGuard.js
 * Misión: Centinela Perimetral de Rutas con control de ráfagas para Sockets, mitigación de saturación de buffer mediante connectionStatus y alias absolutos.
 */

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket'; 
import { useLocation } from '@/hooks/useLocation';   

export const useGpsGuard = (maxAccuracyThreshold = 1500) => {
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [coordenadasPasajero, setCoordenadasPasajero] = useState(null);
  
  // ⚡ DESESTRUCTURACIÓN DE ESTADO DE CONEXIÓN DEL SOCKET
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const isConnected = Boolean(socketContext?.isConnected);
  const connectionStatus = socketContext?.connectionStatus || (isConnected ? 'CONNECTED' : 'DISCONNECTED');
  
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
        // 🛡️ CONDICIÓN ATÓMICA: Emitir únicamente si el estado explícito es 'CONNECTED'
        if (connectionStatus === 'CONNECTED' && socket) {
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
        } else if (connectionStatus !== 'CONNECTED') {
          console.warn(`⚠️ [CIMCO-GPS-GUARD] Emisión omitida para evitar buffer overflow. Estado de socket: ${connectionStatus}`);
        }
      }
    }
  }, [coordenadas, connectionStatus, socket]);

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

  return { showGpsModal, coordenadasPasajero, verificarGps, connectionStatus };
};

export default useGpsGuard;