// Versión Arquitectura: V1.0 - Core de Telemetría y Geolocalización Móvil
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useLocation.js
 * Misión: Consumir el chip GPS nativo del dispositivo con filtrado de precisión milimétrica.
 * Protección: Exclusión de rebotes de señal (falsos positivos > 50 metros) y manejo atómico de estados.
 */
import { useState, useEffect, useRef } from 'react';

export const useLocation = (maxAccuracyThreshold = 50) => {
    const [coordenadas, setCoordenadas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [permisoDenegado, setPermisoDenegado] = useState(false);
    
    // Almacenamos el ID del watch de geolocalización para limpiezas perimetrales
    const watchIdRef = useRef(null);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La API de geolocalización no es soportada por este navegador/dispositivo.");
            setCargando(false);
            return;
        }

        // Configuración nativa forzada para exigir el uso de satélites GPS activos
        const opcionesGps = {
            enableHighAccuracy: true, // Forzar GPS de alta precisión en móviles
            timeout: 15000,           // Esperar máximo 15 segundos por lectura
            maximumAge: 0             // No recuperar ubicaciones en caché, exigir datos frescos
        };

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            // 🛡️ Capa 1: Filtro de Precisión Estrictamente Móvil
            // Ignorar rebotes de antenas de celdas o proxies de red que den un margen > 50 metros
            if (accuracy > maxAccuracyThreshold) {
                console.warn(`[GPS-REBOTE] Ubicación descartada. Precisión insuficiente: ${accuracy}m (Límite: ${maxAccuracyThreshold}m)`);
                return;
            }

            setCoordenadas({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                timestamp: position.timestamp
            });
            setError(null);
            setPermisoDenegado(false);
            setCargando(false);
        };

        const handleError = (geoError) => {
            console.error("❌ [CIMCO-GPS-ERROR] Fallo en la adquisición de coordenadas:", geoError);
            
            // Evaluar código de error nativo del W3C Geolocation API
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
        };

        // ⚡ Inicialización del stream continuo de telemetría reactiva
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            opcionesGps
        );

        // 🧼 Cleanup del Hook: Liberar el hardware del GPS para mitigar drenado de batería
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                console.log("📡 [GPS-TELEMETRÍA] Sensor de ubicación liberado correctamente.");
            }
        };
    }, [maxAccuracyThreshold]);

    return { coordenadas, cargando, error, permisoDenegado };
};