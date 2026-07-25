// Versión Arquitectura: V1.1 - Core de Telemetría y Geolocalización Urbana de Alta Precisión
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useLocation.js
 * Misión: Consumir el chip GPS nativo del dispositivo con filtrado de precisión milimétrica.
 * Protección: Exclusión de rebotes de señal (falsos positivos > 35m) y normalización de coordenadas.
 */
import { useState, useEffect, useRef } from 'react';

export const useLocation = (maxAccuracyThreshold = 35) => {
    const [coordenadas, setCoordenadas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [escaneandoPrecision, setEscaneandoPrecision] = useState(true);
    const [error, setError] = useState(null);
    const [permisoDenegado, setPermisoDenegado] = useState(false);
    
    // Almacenamos el ID del watch de geolocalización para limpiezas perimetrales
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La API de geolocalización no es soportada por este navegador/dispositivo.");
            setCargando(false);
            setEscaneandoPrecision(false);
            return;
        }

        // Configuración nativa forzada para exigir el uso de satélites GPS activos
        const opcionesGps = {
            enableHighAccuracy: true, // Forzar GPS de alta precisión en dispositivos móviles
            timeout: 15000,           // Esperar máximo 15 segundos por lectura de hardware
            maximumAge: 0             // Exigir datos frescos directamente de los satélites
        };

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            // 🛡️ Capa 1: Filtro de Precisión Urbana Estricta
            // Ignorar rebotes de antenas celulares o proxies con margen superior al umbral configurado
            if (accuracy > maxAccuracyThreshold) {
                console.warn(`⚠️ [GPS-REBOTE] Lectura descartada. Precisión actual: ${Math.round(accuracy)}m (Máximo permitido: ${maxAccuracyThreshold}m)`);
                setEscaneandoPrecision(true);
                setCargando(false); // Liberar pantalla de carga inicial indicando que el sensor responde
                return;
            }

            // ⚡ Sincronización Homologada de Coordenadas (Soporta sintaxis lat/lng y latitud/longitud)
            setCoordenadas({
                lat: latitude,
                lng: longitude,
                latitud: latitude,
                longitud: longitude,
                accuracy: accuracy,
                timestamp: position.timestamp || Date.now()
            });

            setError(null);
            setPermisoDenegado(false);
            setCargando(false);
            setEscaneandoPrecision(false);
        };

        const handleError = (geoError) => {
            console.error("❌ [CIMCO-GPS-ERROR] Fallo en la adquisición de coordenadas:", geoError);
            
            // Evaluar código de error nativo de la W3C Geolocation API
            if (geoError.code === geoError.PERMISSION_DENIED) {
                setPermisoDenegado(true);
                setError("El usuario revocó los permisos de acceso al módulo GPS.");
            } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
                setError("Señal de GPS no disponible o fuera de cobertura.");
            } else if (geoError.code === geoError.TIMEOUT) {
                setError("Tiempo de espera agotado al consultar el chip de geolocalización.");
            } else {
                setError(geoError.message || "Error desconocido en el sensor de ubicación.");
            }
            setCargando(false);
            setEscaneandoPrecision(false);
        };

        // ⚡ Inicialización del stream continuo de telemetría reactiva
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            opcionesGps
        );

        // 🧼 Cleanup del Hook: Liberar el hardware del GPS para evitar drenado de batería
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                console.log("📡 [GPS-TELEMETRÍA] Sensor de ubicación liberado correctamente.");
            }
        };
    }, [maxAccuracyThreshold]);

    return { coordenadas, cargando, escaneandoPrecision, error, permisoDenegado };
};