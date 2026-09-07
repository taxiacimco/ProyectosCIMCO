// Versión Arquitectura: V12.0 - Rediseño Modular de Billetera con Recarga Directa Admin/CEO
/**
 * Ubicación: frontend/src/components/pasajero/BilleteraPasajeroModal.jsx
 * Misión: Panel de Billetera Digital CIMCO con gestión de saldo en tiempo real 
 *         y canal exclusivo de comunicación directa vía WhatsApp con la Central / Admin.
 */

import React, { useState } from 'react';
import { 
  Wallet, 
  X, 
  MessageCircle, 
  CheckCircle2, 
  Copy, 
  ArrowUpRight, 
  ShieldCheck 
} from 'lucide-react';

export default function BilleteraPasajeroModal({ 
  isOpen, 
  onClose, 
  saldo = 0, 
  usuario = {} 
}) {
  const [montoSeleccionado, setMontoSeleccionado] = useState(20000);
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  // Teléfono oficial de Soporte / Central Admin para recargas manuales (Nequi / Bancolombia / Efectivo)
  const TELEFONO_ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP || "573104180514"; 

  const handleCopiarID = () => {
    if (usuario?.uid) {
      navigator.clipboard.writeText(usuario.uid);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleSolicitarRecargaAdmin = () => {
    const mensaje = encodeURIComponent(
      `👋 ¡Hola Central CIMCO! Deseo realizar una recarga de billetera.\n\n` +
      `👤 *Usuario:* ${usuario?.nombre || 'Pasajero'}\n` +
      `🆔 *UID:* ${usuario?.uid || 'N/A'}\n` +
      `📱 *Teléfono:* ${usuario?.telefonoMovil || usuario?.telefono || 'N/A'}\n` +
      `💰 *Monto Sugerido:* $${Number(montoSeleccionado || 0).toLocaleString('es-CO')} COP\n\n` +
      `Por favor indíquenme los métodos de pago (Nequi / Transfiya / Efectivo) para confirmar el comprobante.`
    );
    window.open(`https://wa.me/${TELEFONO_ADMIN_WHATSAPP}?text=${mensaje}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#121214]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Billetera Digital CIMCO</h3>
              <p className="text-xs text-gray-400">Gestión de saldo y recargas en línea</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Card de Saldo Principal */}
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Saldo Disponible
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CUENTA ACTIVA
              </span>
            </div>

            <div className="text-3xl font-black text-white mb-4">
              ${Number(saldo || 0).toLocaleString('es-CO')} <span className="text-sm font-semibold text-gray-400">COP</span>
            </div>

            {/* Identificador de Cuenta */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
              <span className="text-gray-400 font-mono">
                ID: {usuario?.uid ? `${usuario.uid.substring(0, 12)}...` : 'CIMCO-PASAJERO'}
              </span>
              <button 
                onClick={handleCopiarID}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                {copiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar ID'}
              </button>
            </div>
          </div>

          {/* Selección de Monto de Recarga */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Monto a Recargar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10000, 20000, 50000].map((monto) => (
                <button
                  key={monto}
                  type="button"
                  onClick={() => setMontoSeleccionado(monto)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-sm border transition-all ${
                    montoSeleccionado === monto
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  ${(monto / 1000).toFixed(0)}k COP
                </button>
              ))}
            </div>
          </div>

          {/* Opciones de Recarga Exclusivas */}
          <div className="space-y-3 pt-2">
            
            {/* Canales Directos: WhatsApp con Admin / Central */}
            <button
              onClick={handleSolicitarRecargaAdmin}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                    Solicitar Recarga a Central (WhatsApp)
                  </div>
                  <div className="text-xs text-gray-400">
                    Atención directa con Admin / Transferencia inmediata
                  </div>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}