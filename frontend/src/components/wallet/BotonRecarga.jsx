// Versión Arquitectura: V12.0 - PROD READY: Pasarela Manual (WhatsApp) para Gestión de Comprobantes
/**
 * Ubicación: @/components/wallet/BotonRecarga.jsx
 * Misión: Orquestar solicitudes de recarga enviando data estructurada al Admin vía WhatsApp.
 */

import React, { useState } from 'react';
import { MessageCircle, DollarSign } from 'lucide-react';

const BotonRecarga = ({ usuarioId = "Desconocido", rol = "usuario", emailConductor = "" }) => {
    const [monto, setMonto] = useState('');

    const handleWhatsAppRedirect = () => {
        // 🛡️ Guarda de Seguridad Financiera
        if (!monto || parseFloat(monto) < 1000) {
            alert("⚠️ Ingrese un monto válido (Mínimo $1,000 COP).");
            return;
        }

        // 📱 NÚMERO DE LA CENTRAL ADMINISTRATIVA (Ajusta este número al tuyo)
        const adminPhone = "573000000000"; 
        
        // 🏗️ Estructuración del manifiesto de recarga
        const mensaje = `Hola Central TAXIA CIMCO. Soy el *${rol.toUpperCase()}* con ID: *${usuarioId}* ${emailConductor ? `(${emailConductor})` : ''}.\n\nSolicito una recarga a mi billetera por valor de: *$${parseFloat(monto).toLocaleString('es-CO')} COP*.\n\n_Adjunto a este mensaje mi comprobante de transferencia bancaria._`;

        // Disparo de URL profunda (Deep Link) a WhatsApp
        const url = `https://wa.me/${adminPhone}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
        setMonto('');
    };

    return (
        <div className="w-full flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={14} className="text-emerald-500" />
                </div>
                <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="Monto a recargar..."
                    className="w-full bg-[#09090b]/60 border border-emerald-500/30 text-emerald-400 placeholder-emerald-700/50 text-[11px] uppercase tracking-widest font-bold font-mono rounded-xl pl-8 pr-3 py-3.5 outline-none focus:border-emerald-400 focus:bg-[#09090b]/90 transition-all shadow-inner"
                />
            </div>
            
            <button
                onClick={handleWhatsAppRedirect}
                className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3.5 px-6 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-95 shrink-0"
            >
                <MessageCircle size={16} className="fill-current" />
                <span className="text-[10px] uppercase tracking-widest">Enviar Recibo</span>
            </button>
        </div>
    );
};

export default BotonRecarga;