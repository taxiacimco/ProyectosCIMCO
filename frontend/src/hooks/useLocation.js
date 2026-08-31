// Versión Arquitectura: V2.1 - Actualización de Opciones de Geolocalización a Parámetros de Rendimiento Rápido
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useLocation.js
 * Misión: Consumir el sensor GPS del dispositivo con opciones optimizadas solicitadas ({ enableHighAccuracy: false, timeout: 15000, maximumAge: 5000 }).
 */
import { useState, useEffect, useRef } from 'react';

export const useLocation = (maxAccuracyThreshold = 1500) => {
    const [coordenadas, setCoordenadas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [escaneandoPrecision, setEscaneandoPrecision] = useState(true);
    const [error, setError] = useState(null);
    const [permisoDenegado, setPermisoDenegado] = useState(false);
    
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La API de geolocalización no es soportada por este navegador/dispositivo.");
            setCargando(false);
            setEscaneandoPrecision(false);
            return;
        }

        // 🛡️ Opciones de geolocalización ajustadas exactamente al requerimiento técnico
        const opcionesGpsResiliente = {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 5000
        };

        const handleSuccess = (position) => {
            if (!position || !position.coords) {
                setCargando(false);
                setEscaneandoPrecision(false);
                return;
            }

            const { latitude, longitude, accuracy } = position.coords;

            // 🛡️ Filtro Adaptativo: Acepta lecturas dentro del umbral
            if (typeof accuracy === 'number' && accuracy > maxAccuracyThreshold) {
                console.warn(`⚠️ [GPS-REBOTE] Lectura descartada. Precisión actual: ${Math.round(accuracy)}m (Umbral: ${maxAccuracyThreshold}m)`);
                setEscaneandoPrecision(true);
                setCargando(false);
                return;
            }

            setCoordenadas({
                lat: latitude,
                lng: longitude,
                latitud: latitude,
                longitud: longitude,
                accuracy: accuracy || 0,
                timestamp: position.timestamp || Date.now()
            });

            setError(null);
            setPermisoDenegado(false);
            setCargando(false);
            setEscaneandoPrecision(false);
        };

        const handleError = (geoError) => {
            console.error("❌ [CIMCO-GPS-ERROR] Fallo en la adquisición de coordenadas:", geoError);
            
            if (geoError && geoError.code === geoError.PERMISSION_DENIED) {
                setPermisoDenegado(true);
                setError("El usuario revocó los permisos de acceso al módulo GPS.");
            } else if (geoError && geoError.code === geoError.POSITION_UNAVAILABLE) {
                setError("Señal de GPS no disponible o fuera de cobertura.");
            } else if (geoError && geoError.code === geoError.TIMEOUT) {
                setError("Tiempo de espera agotado al consultar el chip de geolocalización.");
            } else {
                setError((geoError && geoError.message) || "Error desconocido en el sensor de ubicación.");
            }
            setCargando(false);
            setEscaneandoPrecision(false);
        };

        // Obtener lectura inicial inmediata
        navigator.geolocation.getCurrentPosition(
            handleSuccess,
            handleError,
            opcionesGpsResiliente
        );

        // Suscribirse a cambios de posición continuos
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            opcionesGpsResiliente
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                console.log("📡 [GPS-TELEMETRÍA] Sensor de ubicación liberado correctamente.");
            }
        };
    }, [maxAccuracyThreshold]);

    return { coordenadas, cargando, escaneandoPrecision, error, permisoDenegado };
};