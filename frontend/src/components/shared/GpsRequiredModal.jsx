// Versión Arquitectura: V10.0 - PROD READY: Control de Excepciones de Hardware, Manejo de Estados de Bloqueo y Fallback de Permisos
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\shared\GpsRequiredModal.jsx
 * Misión: Bloqueo de UI perimetral cuando el GPS está inactivo. Despierta el prompt nativo y gestiona excepciones de hardware.
 * Estética: CIMCO-UI Dark Mode Premium Glassmorphism (backdrop-blur-md, bg-[#121214]/90, border-white/10).
 */

import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

const GpsRequiredModal = ({ isOpen, onRetry }) => {
  const [verificando, setVerificando] = useState(false);
  const [errorHardware, setErrorHardware] = useState(null); // 🛡️ Captura de excepciones reales de GPS

  // Resetear estados internos al cerrar/abrir el modal
  useEffect(() => {
    if (!isOpen) {
      setVerificando(false);
      setErrorHardware(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivarGpsInApp = async () => {
    setVerificando(true);
    setErrorHardware(null);
    console.log("📡 [CIMCO-GPS-BRIDGE] Solicitando inicialización de hardware de geolocalización...");

    if (!navigator.geolocation) {
      setErrorHardware({
        titulo: "Dispositivo No Compatible",
        mensaje: "Tu navegador o dispositivo actual no soporta el hardware de geolocalización."
      });
      setVerificando(false);
      return;
    }

    // Ejecuta una consulta de alta precisión. Despliega la ventana nativa del sistema operativo.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("✅ [CIMCO-GPS-BRIDGE] Hardware reactivado exitosamente desde el prompt.");
        setVerificando(false);
        if (onRetry) onRetry(); // Callback para re-renderizar mapas e hilos de despacho
      },
      (error) => {
        console.warn(`❌ [CIMCO-GPS-BRIDGE] Error de hardware detectado. Código: ${error.code}`);
        setVerificando(false);
        
        // 🚨 Mapeo granular de fallos de hardware para evitar bucles ciegos de reintento
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorHardware({
              titulo: "Permiso Denegado",
              mensaje: "Bloqueaste el acceso al GPS. Debes ir a la configuración de tu navegador/celular y permitir los permisos de ubicación para esta app."
            });
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorHardware({
              titulo: "Señal de Satélite Débil",
              mensaje: "No se pudo determinar la ubicación. Verifica si el GPS del celular está encendido en la barra de notificaciones."
            });
            break;
          case error.TIMEOUT:
            setErrorHardware({
              titulo: "Tiempo de Espera Agotado",
              mensaje: "El satélite tardó demasiado en responder. Intenta de nuevo desde un espacio más abierto."
            });
            break;
          default:
            setErrorHardware({
              titulo: "Error de Ubicación",
              mensaje: "Ocurrió un error inesperado al intentar encender el GPS."
            });
        }
        
        // Ejecución preventiva para notificar al componente padre del estado actual
        if (onRetry) onRetry(); 
      },
      {
        enableHighAccuracy: true,
        timeout: 8000, // ⚡ Optimizado de 5000 a 8000ms para evitar falsos negativos en arranques en frío de GPS
        maximumAge: 0  // Fuerza la lectura de hardware fresco, no caché
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md backdrop-blur-xl bg-[#121214]/90 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center">
        
        {/* Glow Decorativo de Fondo */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Contenedor de Icono Dinámico (Cambia según estado de error) */}
        <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full border mb-4 ${
          errorHardware ? 'bg-rose-500/10 border-rose-500/20 animate-none' : 'bg-amber-500/10 border-amber-500/20 animate-pulse'
        }`}>
          {errorHardware ? (
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          ) : (
            <MapPin className="w-8 h-8 text-amber-500" />
          )}
        </div>

        {/* Encabezado Técnico Adaptativo */}
        <h2 className={`font-black text-lg uppercase tracking-wider mb-2 ${errorHardware ? 'text-rose-400' : 'text-white'}`}>
          {errorHardware ? errorHardware.titulo : 'Se requiere ubicación activa'}
        </h2>
        
        {/* Línea divisoria */}
        <div className={`w-12 h-[2px] mx-auto mb-4 ${errorHardware ? 'bg-rose-500' : 'bg-amber-500'}`} />

        {/* Mensaje Informativo Principal */}
        {!errorHardware ? (
          <p className="text-sm text-zinc-300 font-medium leading-relaxed px-2 mb-6">
            Activar <span className="text-amber-400 font-bold">GPS</span> para que el transporte llegue con precaución y precisión a tu ubicación actual.
          </p>
        ) : (
          <p className="text-xs text-rose-200/80 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 font-medium leading-relaxed mb-6 text-left">
            {errorHardware.mensaje}
          </p>
        )}

        {/* Bloque Informativo de Contingencia */}
        <div className="flex items-start gap-3 bg-zinc-900/60 border border-white/5 rounded-xl p-3 text-left mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-500/80 shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-400 uppercase font-mono tracking-tight">
            Nota: Al presionar el botón inferior, el navegador solicitará el acceso inmediato. Asegúrate de conceder el permiso en el aviso del sistema.
          </p>
        </div>

        {/* Acción de Reintento e Inyección In-App */}
        <button
          onClick={handleActivarGpsInApp}
          disabled={verificando}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-neutral-950 font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 transform active:scale-98 shadow-lg ${
            errorHardware 
              ? 'bg-rose-400 hover:bg-rose-500 shadow-rose-500/10' 
              : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
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