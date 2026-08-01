// Versión Arquitectura: V1.3 - Core de Telemetría Táctica y Geolocalización Urbana Adaptativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useLocation.js
 * Misión: Consumir el sensor GPS nativo del dispositivo con tolerancia satelital progresiva y fallback anti-timeout.
 */
import { useState, useEffect, useRef } from 'react';

export const useLocation = (maxAccuracyThreshold = 1500) => {
    const [coordenadas, setCoordenadas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [escaneandoPrecision, setEscaneandoPrecision] = useState(true);
    const [error, setError] = useState(null);
    const [permisoDenegado, setPermisoDenegado] = useState(false);
    
    const watchIdRef = useRef(null);
    const usandoAltaPrecisionRef = useRef(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La API de geolocalización no es soportada por este navegador/dispositivo.");
            setCargando(false);
            setEscaneandoPrecision(false);
            return;
        }

        const opcionesAltaPrecision = {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 5000
        };

        const opcionesModoEstandar = {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 10000
        };

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            // 🛡️ Filtro Adaptativo: Acepta lecturas dentro del umbral (predeterminado 1500m para soporte de laptops/Wi-Fi)
            if (accuracy > maxAccuracyThreshold && usandoAltaPrecisionRef.current) {
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
            
            if (geoError.code === geoError.PERMISSION_DENIED) {
                setPermisoDenegado(true);
                setError("El usuario revocó los permisos de acceso al módulo GPS.");
                setCargando(false);
                setEscaneandoPrecision(false);
            } else if (geoError.code === geoError.TIMEOUT && usandoAltaPrecisionRef.current) {
                console.warn("⚠️ [CIMCO-GPS-FALLBACK] Timeout en GPS Satelital Puro. Conmutando a modo de localización estándar (Wi-Fi/Red)...");
                usandoAltaPrecisionRef.current = false;
                
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }

                watchIdRef.current = navigator.geolocation.watchPosition(
                    handleSuccess,
                    (errDegradado) => {
                        setError("Tiempo de espera agotado al consultar el chip de geolocalización.");
                        setCargando(false);
                        setEscaneandoPrecision(false);
                    },
                    opcionesModoEstandar
                );
            } else {
                if (geoError.code === geoError.POSITION_UNAVAILABLE) {
                    setError("Señal de GPS no disponible o fuera de cobertura.");
                } else if (geoError.code === geoError.TIMEOUT) {
                    setError("Tiempo de espera agotado al consultar el chip de geolocalización.");
                } else {
                    setError(geoError.message || "Error desconocido en el sensor de ubicación.");
                }
                setCargando(false);
                setEscaneandoPrecision(false);
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            opcionesAltaPrecision
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