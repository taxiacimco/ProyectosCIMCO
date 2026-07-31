// Versión Arquitectura: V1.2 - Core de Telemetría Táctica y Geolocalización Urbana Progresiva
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\hooks\useLocation.js
 * Misión: Consumir el sensor GPS nativo del dispositivo con tolerancia satelital progresiva y fallback anti-timeout.
 * Protección: Degradación elegante de precisión urbana, prevención de bloqueos por timeout y filtro de rebotes de red.
 */
import { useState, useEffect, useRef } from 'react';

export const useLocation = (maxAccuracyThreshold = 50) => {
    const [coordenadas, setCoordenadas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [escaneandoPrecision, setEscaneandoPrecision] = useState(true);
    const [error, setError] = useState(null);
    const [permisoDenegado, setPermisoDenegado] = useState(false);
    
    // Almacenamos el ID del watch y banderas de reintento táctico
    const watchIdRef = useRef(null);
    const usandoAltaPrecisionRef = useRef(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError("La API de geolocalización no es soportada por este navegador/dispositivo.");
            setCargando(false);
            setEscaneandoPrecision(false);
            return;
        }

        // ⚡ OPCIONES DE GEOLOCALIZACIÓN NATIVA OPTIMIZADAS
        const opcionesAltaPrecision = {
            enableHighAccuracy: true,  // Exigir antenas GPS físicas
            timeout: 20000,            // Ventana de 20s para enganchar satélites (Mitiga TIMEOUT en cerrados)
            maximumAge: 5000           // Permitir coordenadas frescas en caché de hasta 5s de antigüedad
        };

        const opcionesModoEstandar = {
            enableHighAccuracy: false, // Fallback por triangulación de Red/Wi-Fi/Celdas
            timeout: 10000,            // Ventana rápida de 10s
            maximumAge: 10000          // Permitir coordenadas de hasta 10s de antigüedad
        };

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            // 🛡️ Capa de Filtro de Precisión Urbana Estricta (con tolerancia adaptativa)
            if (accuracy > maxAccuracyThreshold && usandoAltaPrecisionRef.current) {
                console.warn(`⚠️ [GPS-REBOTE] Lectura de alta precisión descartada. Precisión actual: ${Math.round(accuracy)}m (Umbral: ${maxAccuracyThreshold}m)`);
                setEscaneandoPrecision(true);
                setCargando(false);
                return;
            }

            // ⚡ Sincronización Homologada de Coordenadas
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
                setCargando(false);
                setEscaneandoPrecision(false);
            } else if (geoError.code === geoError.TIMEOUT && usandoAltaPrecisionRef.current) {
                // 🚀 REINTENTO TÁCTICO AUTOMÁTICO (FALLBACK):
                // Si la antena satelital satura por tiempo, conmutar transparentemente a triangulación por red Wi-Fi/Celular
                console.warn("⚠️ [CIMCO-GPS-FALLBACK] Timeout en GPS Satelital Puro. Conmutando a modo de localización estándar (Wi-Fi/Red)...");
                usandoAltaPrecisionRef.current = false;
                
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }

                // Iniciar escucha en modo estándar sin interrumpir la experiencia de usuario
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

        // ⚡ Inicialización del stream continuo de telemetría reactiva (Inicio en Alta Precisión)
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            opcionesAltaPrecision
        );

        // 🧼 Cleanup del Hook: Liberar el hardware del GPS
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                console.log("📡 [GPS-TELEMETRÍA] Sensor de ubicación liberado correctamente.");
            }
        };
    }, [maxAccuracyThreshold]);

    return { coordenadas, cargando, escaneandoPrecision, error, permisoDenegado };
};