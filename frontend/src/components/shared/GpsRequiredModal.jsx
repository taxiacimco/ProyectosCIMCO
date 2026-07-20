// Versión Arquitectura: V10.1 - PROD READY: Monitoreo Proactivo de Permisos, Prevención de Fugas de Memoria y Accesibilidad ARIA
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\shared\GpsRequiredModal.jsx
 * Misión: Bloqueo de UI perimetral cuando el GPS está inactivo. Despierta de manera quirúrgica el prompt nativo,
 * gestiona excepciones de hardware, previene fugas de memoria y monitorea proactivamente el estado del permiso.
 * Estética: CIMCO-UI Dark Mode Premium Glassmorphism (backdrop-blur-md, bg-[#121214]/90, border-white/10).
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

const GpsRequiredModal = ({ isOpen, onRetry }) => {
  const [verificando, setVerificando] = useState(false);
  const [errorHardware, setErrorHardware] = useState(null); // 🛡️ Captura de excepciones reales de GPS
  const isMounted = useRef(true);

  // Controlar ciclo de vida para evitar fugas de memoria en llamadas asíncronas
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Monitoreo proactivo del estado del permiso de ubicación en el navegador
  useEffect(() => {
    if (!isOpen) {
      if (isMounted.current) {
        setVerificando(false);
        setErrorHardware(null);
      }
      return;
    }

    const verificarPermisoExistente = async () => {
      // Validar si el navegador soporta las APIs modernas de permisos y geolocalización
      if (navigator.permissions && navigator.geolocation) {
        try {
          const resultado = await navigator.permissions.query({ name: 'geolocation' });
          
          // Escuchar cambios en caliente por si el usuario activa/desactiva el permiso desde el candado de la URL
          resultado.onchange = () => {
            if (!isMounted.current) return;
            if (resultado.state === 'denied') {
              setErrorHardware({
                titulo: "Permiso Bloqueado",
                mensaje: "Se detectó que bloqueaste el acceso al GPS. Para continuar, haz clic en el icono del candado en la barra de direcciones de tu navegador y activa la Ubicación."
              });
            } else if (resultado.state === 'granted') {
              setErrorHardware(null);
              if (onRetry) onRetry();
            }
          };

          // Inicialización preventiva del estado del modal según la configuración actual del navegador
          if (resultado.state === 'denied' && isMounted.current) {
            setErrorHardware({
              titulo: "Permiso Bloqueado",
              mensaje: "El acceso al GPS está denegado en tu navegador. Por favor, ve a la configuración de permisos del sitio y habilita la ubicación."
            });
          }
        } catch (e) {
          console.warn("⚠️ [CIMCO-GPS-BRIDGE] La API de Permisos no es totalmente compatible con este navegador/WebView.");
        }
      }
    };

    verificarPermisoExistente();
  }, [isOpen, onRetry]);

  if (!isOpen) return null;

  const handleActivarGpsInApp = async () => {
    if (!isMounted.current) return;
    setVerificando(true);
    setErrorHardware(null);
    console.log("📡 [CIMCO-GPS-BRIDGE] Solicitando inicialización de hardware de geolocalización...");

    if (!navigator.geolocation) {
      if (isMounted.current) {
        setErrorHardware({
          titulo: "Dispositivo No Compatible",
          mensaje: "Tu navegador o dispositivo actual no soporta el hardware de geolocalización requerido para este nodo táctico."
        });
        setVerificando(false);
      }
      return;
    }

    // Ejecuta una consulta de alta precisión. Despliega la ventana nativa del sistema operativo.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ [CIMCO-GPS-BRIDGE] Hardware reactivado exitosamente desde el prompt.");
        if (isMounted.current) {
          setVerificando(false);
        }
        if (onRetry) onRetry(); // Callback para re-renderizar mapas e hilos de despacho
      },
      (error) => {
        console.warn(`❌ [CIMCO-GPS-BRIDGE] Error de hardware detectado. Código: ${error.code}`);
        if (!isMounted.current) return;
        setVerificando(false);
        
        // 🚨 Mapeo granular de fallos de hardware para evitar bucles ciegos de reintento
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorHardware({
              titulo: "Permiso Denegado",
              mensaje: "Bloqueaste el acceso al GPS. Debes ir a la configuración de tu navegador/celular y permitir los permisos de ubicación para esta aplicación."
            });
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorHardware({
              titulo: "Señal Satelital Débil",
              mensaje: "No se pudo determinar la ubicación física. Verifica si el GPS del celular está encendido en la barra de notificaciones o si estás bajo techo."
            });
            break;
          case error.TIMEOUT:
            setErrorHardware({
              titulo: "Tiempo de Espera Agotado",
              mensaje: "El satélite tardó demasiado en responder. Intenta de nuevo desde un espacio más despejado."
            });
            break;
          default:
            setErrorHardware({
              titulo: "Error de Ubicación",
              mensaje: "Ocurrió un error inesperado al intentar encender o sincronizar el hardware GPS."
            });
        }
        
        // Ejecución preventiva para notificar al componente padre del estado actual
        if (onRetry) onRetry(); 
      },
      {
        enableHighAccuracy: true,
        timeout: 8000, // ⚡ Optimizado a 8000ms para evitar falsos negativos en arranques en frío de GPS
        maximumAge: 0  // Fuerza la lectura de hardware fresco, no de memoria caché
      }
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-gps-title"
    >
      <div className="w-full max-w-md backdrop-blur-xl bg-[#121214]/90 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center">
        
        {/* Glow Decorativo de Fondo */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Contenedor de Icono Dinámico (Cambia según estado de error) */}
        <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full border mb-4 transition-all duration-300 ${
          errorHardware ? 'bg-rose-500/10 border-rose-500/20 animate-none' : 'bg-amber-500/10 border-amber-500/20 animate-pulse'
        }`}>
          {errorHardware ? (
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          ) : (
            <MapPin className="w-8 h-8 text-amber-500" />
          )}
        </div>

        {/* Encabezado Técnico Adaptativo */}
        <h2 
          id="modal-gps-title"
          className={`font-mono font-black text-sm uppercase tracking-wider mb-2 transition-colors duration-300 ${errorHardware ? 'text-rose-400' : 'text-white'}`}
        >
          {errorHardware ? errorHardware.titulo : 'Se requiere ubicación activa'}
        </h2>
        
        {/* Línea divisoria */}
        <div className={`w-12 h-[2px] mx-auto mb-4 transition-colors duration-300 ${errorHardware ? 'bg-rose-500' : 'bg-amber-500'}`} />

        {/* Mensaje Informativo Principal */}
        {!errorHardware ? (
          <p className="text-xs text-zinc-300 font-medium leading-relaxed px-2 mb-6">
            Activar el <span className="text-amber-400 font-bold">GPS</span> es indispensable para que el ecosistema y la central de despacho de <span className="text-white font-black">CIMCO</span> tracen tus coordenadas y rutas de manera segura y en tiempo real.
          </p>
        ) : (
          <p className="text-xs text-rose-200/80 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 font-medium leading-relaxed mb-6 text-left">
            {errorHardware.mensaje}
          </p>
        )}

        {/* Bloque Informativo de Contingencia */}
        <div className="flex items-start gap-3 bg-zinc-900/60 border border-white/5 rounded-xl p-3 text-left mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-500/80 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-400 uppercase font-mono tracking-tight leading-normal">
            Nota: Al presionar el botón de activación, el navegador levantará el cuadro de autorización de coordenadas. Por favor, marca "Permitir siempre".
          </p>
        </div>

        {/* Acción de Reintento e Inyección In-App */}
        <button
          onClick={handleActivarGpsInApp}
          disabled={verificando}
          className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 text-neutral-950 font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 transform active:scale-98 shadow-lg ${
            errorHardware 
              ? 'bg-rose-400 hover:bg-rose-500 shadow-rose-500/10 active:bg-rose-500' 
              : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 active:bg-amber-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <RefreshCw className={`w-4 h-4 text-neutral-950 ${verificando ? 'animate-spin' : ''}`} />
          {verificando ? 'Conectando con Satélites...' : errorHardware ? 'Reintentar Inicialización' : 'Activar ubicación en la App'}
        </button>
      </div>
    </div>
  );
};

export default GpsRequiredModal;