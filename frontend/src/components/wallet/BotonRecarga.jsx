// Versión Arquitectura: V13.0 - PROD READY: Erradicación de Bloqueos Síncronos y Validación de Entrada en Tiempo Real
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\wallet\BotonRecarga.jsx
 * Misión: Orquestar solicitudes de recarga enviando data estructurada al Admin vía WhatsApp sin alertas de navegador.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Esmeralda Transaccional).
 */

import React, { useState } from 'react';
import { MessageCircle, DollarSign, AlertCircle } from 'lucide-react';

const BotonRecarga = ({ usuarioId = "Desconocido", rol = "usuario", emailConductor = "" }) => {
    const [monto, setMonto] = useState('');
    const [errorValidacion, setErrorValidacion] = useState('');

    const handleMontoChange = (e) => {
        const valor = e.target.value;
        // 🛡️ Sanitización en caliente: Impedir números negativos o flotantes (COP Neto)
        if (valor.includes('.') || valor.includes('-')) return;
        
        setMonto(valor);
        if (errorValidacion) setErrorValidacion('');
    };

    const handleWhatsAppRedirect = () => {
        // 🛡️ Guarda de Seguridad Financiera Integrada a la UI
        if (!monto || parseFloat(monto) < 1000) {
            setErrorValidacion("Monto inválido (Mínimo $1,000 COP).");
            return;
        }

        setErrorValidacion('');
        // 📱 NÚMERO DE LA CENTRAL ADMINISTRATIVA TAXIA CIMCO
        const adminPhone = "573000000000"; 
        
        // 🏗️ Estructuración del manifiesto de recarga transparente
        const mensaje = `Hola Central TAXIA CIMCO. Soy el *${rol.toUpperCase()}* con ID: *${usuarioId}* ${emailConductor ? `(${emailConductor})` : ''}.\\n\\nSolicito una recarga a mi billetera por valor de: *$${parseFloat(monto).toLocaleString('es-CO')} COP*.\\n\\nAdjunto el comprobante de transferencia correspondiente.`;
        
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="w-full flex flex-col gap-2 animate-in fade-in duration-200">
            <div className="w-full flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign size={14} className={errorValidacion ? "text-rose-500" : "text-emerald-500"} />
                    </div>
                    <input
                        type="number"
                        value={monto}
                        onChange={handleMontoChange}
                        placeholder="Monto a recargar..."
                        className={`w-full bg-[#09090b]/60 border text-[11px] uppercase tracking-widest font-bold font-mono rounded-xl pl-8 pr-3 py-3.5 outline-none transition-all shadow-inner ${
                            errorValidacion 
                                ? "border-rose-500/50 text-rose-400 placeholder-rose-700/50 focus:border-rose-400 focus:bg-[#09090b]/90" 
                                : "border-emerald-500/30 text-emerald-400 placeholder-emerald-700/50 focus:border-emerald-400 focus:bg-[#09090b]/90"
                        }`}
                    />
                </div>
                
                <button
                    onClick={handleWhatsAppRedirect}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-3.5 px-6 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] active:scale-98 text-xs uppercase tracking-wider shrink-0"
                >
                    <MessageCircle size={14} />
                    Notificar Pago
                </button>
            </div>

            {/* Banner de Feedback de Error Contextual */}
            {errorValidacion && (
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider animate-in slide-in-from-top-1">
                    <AlertCircle size={12} className="shrink-0" />
                    {errorValidacion}
                </div>
            )}
        </div>
    );
};

export default BotonRecarga;