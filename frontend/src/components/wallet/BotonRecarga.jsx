// Versión Arquitectura: V16.0 - Integración Gestión CEO/Admin & Control de Saldo Crítico (< $2.000 COP)
/**
 * Ubicación: frontend\src\components\wallet\BotonRecarga.jsx
 * Misión: Orquestar solicitudes de recarga directa autorizadas vía CEO/Administración central,
 *         con detección de estado crítico e inoperativo para conductores y despachadores con saldo < $2.000 COP.
 * Estilo: CIMCO-UI V9.3 Glassmorphism (Identidad Naranja & Alerta Crítica Rose Integrada).
 */

import React, { useState } from 'react';
import { MessageCircle, DollarSign, AlertCircle, ShieldCheck, AlertTriangle } from 'lucide-react';

const BotonRecarga = ({ 
    usuarioId = "Desconocido", 
    rol = "usuario", 
    emailConductor = "", 
    saldoActual = 0,
    adminPhoneProp 
}) => {
    const [monto, setMonto] = useState('');
    const [errorValidacion, setErrorValidacion] = useState('');

    const saldoNumerico = Number(saldoActual) || 0;
    const rolNormalizado = String(rol).toLowerCase().trim();
    
    // Roles operativos sujetos a la regla de recarga mínima obligatoria
    const esRolOperativo = ['conductor', 'mototaxi', 'motoparrillero', 'motocarga', 'despachador'].includes(rolNormalizado);
    const esSaldoCritico = esRolOperativo && saldoNumerico < 2000;

    const handleMontoChange = (e) => {
        const valor = e.target.value;
        // 🛡️ Sanitización V16.0: Impedir números negativos, flotantes o caracteres de control (COP Neto)
        if (/[.\-,eE]/.test(valor)) return;
        
        setMonto(valor);
        if (errorValidacion) setErrorValidacion('');
    };

    const handleWhatsAppRedirect = () => {
        const montoNumerico = parseFloat(monto) || 0;

        // 🛡️ Guarda de Seguridad Financiera Integrada a la UI
        if (!monto || montoNumerico < 1000) {
            setErrorValidacion("Monto inválido (Mínimo $1.000 COP).");
            return;
        }

        // Si el usuario está en estado crítico, validar que el monto a recargar sea suficiente (>= 2000 COP)
        if (esSaldoCritico && montoNumerico < 2000) {
            setErrorValidacion("Monto insuficiente para reactivación. Mínimo $2.000 COP.");
            return;
        }

        setErrorValidacion('');
        
        // 📱 NÚMERO DE LA CENTRAL ADMINISTRATIVA TAXIA CIMCO (Parametrización dinámica por Prop/Env con Fallback seguro)
        const adminPhone = adminPhoneProp || import.meta.env.VITE_ADMIN_WHATSAPP || "573000000000"; 
        
        // 🏗️ Mapeo estructurado para autorización por Administrador/CEO
        const mensaje = `Hola Central / Administración CEO TAXIA CIMCO.\n\nSoy el *${rol.toUpperCase()}* con ID: *${usuarioId}* ${emailConductor ? `(${emailConductor})` : ''}.\n\nSolicito la *Aprobación y Autorización Directa de Recarga* en mi billetera por valor de: *$${montoNumerico.toLocaleString('es-CO')} COP*.\n\n${esSaldoCritico ? '⚠️ *ESTADO ACTUAL: SALDO INOPERATIVO (< $2.000 COP)* - Solicitud Prioritaria de Reactivación.\n\n' : ''}Adjunto el comprobante de pago/transferencia para verificación de la Administración CEO.`;
        
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="w-full flex flex-col gap-2.5 animate-in fade-in duration-200 font-mono antialiased">
            {/* Banner Informativo de Gestión CEO / Estado Crítico */}
            {esSaldoCritico ? (
                <div className="flex items-center gap-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-bold uppercase tracking-wider animate-pulse">
                    <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                    <span>
                        Saldo Inoperativo: Su saldo es menor a $2.000 COP. Requiere recarga mínima de <strong className="text-white">$2.000 COP</strong> para reactivar la operabilidad.
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.02] border border-white/5 rounded-lg text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                    <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                    <span>Recargas directas procesadas y autorizadas por Administración / CEO</span>
                </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign size={14} className={errorValidacion ? "text-rose-500" : esSaldoCritico ? "text-rose-400" : "text-orange-400"} />
                    </div>
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={monto}
                        onChange={handleMontoChange}
                        placeholder={esSaldoCritico ? "Monto mín. $2.000..." : "Monto a recargar..."}
                        className={`w-full bg-[#0c0c0e] border text-[11px] uppercase tracking-widest font-bold font-mono rounded-xl pl-8 pr-3 py-3.5 outline-none transition-all shadow-inner ${
                            errorValidacion 
                                ? "border-rose-500/50 text-rose-400 placeholder-rose-700/50 focus:border-rose-400 focus:bg-[#0c0c0e]/90" 
                                : esSaldoCritico
                                ? "border-rose-500/30 text-rose-300 placeholder-rose-600/50 focus:border-rose-500/60 focus:bg-[#0c0c0e]/90"
                                : "border-white/5 text-orange-400 placeholder-zinc-700 focus:border-orange-500/40 focus:bg-[#0c0c0e]/90"
                        }`}
                    />
                </div>
                
                <button
                    onClick={handleWhatsAppRedirect}
                    className={`flex items-center justify-center gap-2 font-black py-3.5 px-6 rounded-xl transition-all duration-300 active:scale-98 text-xs uppercase tracking-wider shrink-0 ${
                        esSaldoCritico
                            ? "bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:shadow-[0_0_25px_rgba(244,63,94,0.35)]"
                            : "bg-orange-500 hover:bg-orange-400 text-zinc-950 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.25)]"
                    }`}
                >
                    <MessageCircle size={14} />
                    {esSaldoCritico ? "Recarga Requerida - Saldo Inoperativo" : "Solicitar Recarga CEO"}
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