// Versión Arquitectura: V22.0 - Sincronización Estática con Túnel ngrok Fijo y Renderizado de Logo Central
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\QrGenerator.jsx
 * Misión: Componente administrativo para la generación y exportación de credenciales QR de flota y conductores.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V22.0: Vinculación con túnel fijo ngrok y uso de imageSettings para renderizar texto centralizado del rol.
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { QrCode, Download, RefreshCw, ShieldCheck, Loader, AlertTriangle, Printer, Layers } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const QrGenerator = () => {
    const { user } = useAuth();
    const [identificador, setIdentificador] = useState('');
    const [tipoEntidad, setTipoEntidad] = useState('conductor');
    const [qrGenerado, setQrGenerado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const qrRef = useRef(null);

    // 🌐 TÚNEL FIJO DE NGROK CON REDIRECCIÓN DE RUTA PARA MÓVILES
    const NGROK_BASE_URL = 'https://globosely-appreciative-zander.ngrok-free.dev';

    // Normalización de la ruta de redirección del QR según el rol/entidad
    const getRutaDestino = () => {
        const idLimpiado = identificador.trim().toUpperCase();
        if (tipoEntidad === 'conductor') return `${NGROK_BASE_URL}/mototaxi/home?uid=${idLimpiado}`;
        if (tipoEntidad === 'unidad') return `${NGROK_BASE_URL}/motocarga/home?placa=${idLimpiado}`;
        return `${NGROK_BASE_URL}/despachador/home?nodo=${idLimpiado}`;
    };

    const targetUrlString = getRutaDestino();

    const handleGenerarQr = async (e) => {
        e.preventDefault();
        if (!identificador.trim()) {
            setError("Debe especificar un identificador válido para la entidad.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
            
            // Persistencia del registro de auditoría en la bitácora central de Firestore
            await addDoc(collection(db, pathColeccion), {
                entidadId: identificador.trim().toUpperCase(),
                tipo: tipoEntidad,
                creadoPor: user?.uid || 'SISTEMA_ADMIN',
                fechaCreacion: serverTimestamp(),
                payloadUrl: targetUrlString
            });

            setQrGenerado(true);
            setLoading(false);
        } catch (err) {
            console.error("❌ [CIMCO-QR-GENERATOR-ERROR] Fallo en persistencia de credencial:", err);
            setError("No se pudo registrar la credencial en la bitácora central.");
            setLoading(false);
        }
    };

    const handleDescargarQr = () => {
        try {
            const svgElement = qrRef.current?.querySelector('svg');
            if (!svgElement) {
                setError("No se localizó el elemento vectorial para exportación.");
                return;
            }

            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            
            const urlContext = window.URL || window.webkitURL || window;
            const blobURL = urlContext.createObjectURL(svgBlob);
            
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1024;
                canvas.height = 1024;
                const context = canvas.getContext('2d');
                
                if (context) {
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    context.drawImage(image, 64, 64, 896, 896);
                    
                    const pngURL = canvas.toDataURL('image/png');
                    const downloadLink = document.createElement('a');
                    downloadLink.href = pngURL;
                    downloadLink.download = `CIMCO_QR_${tipoEntidad.toUpperCase()}_${identificador.trim().toUpperCase()}.png`;
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
                urlContext.revokeObjectURL(blobURL);
            };
            image.src = blobURL;
        } catch (err) {
            console.error("❌ [CIMCO-QR-EXPORT-ERROR] Fallo al rasterizar vector SVG:", err);
            setError("Ocurrió un error interno durante la exportación de la imagen.");
        }
    };

    // 🎨 Generador dinámico del Texto Central en formato SVG Data URL
    const buildCentralLogoDataUrl = () => {
        const textoRol = tipoEntidad === 'conductor' ? 'MOTO' : tipoEntidad === 'unidad' ? 'FLOTA' : 'DESP';
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="180" height="75" viewBox="0 0 180 75">
                <rect width="100%" height="100%" fill="#121214" rx="12"/>
                <rect width="100%" height="100%" fill="none" stroke="#eab308" stroke-width="3" rx="12"/>
                <text x="50%" y="32" font-family="monospace" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">TaxiA CIMCO</text>
                <text x="50%" y="58" font-family="monospace" font-size="17" font-weight="900" fill="#eab308" text-anchor="middle" letter-spacing="2">[${textoRol}]</text>
            </svg>
        `;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8 font-mono antialiased flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[130px] pointer-events-none" />

            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 relative z-10">
                {/* PANEL DE CONFIGURACIÓN Y PARÁMETROS */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <QrCode size={20} className="text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Generador de Credenciales</h2>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Emisión atómica de tokens QR corporativos</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 backdrop-blur-md bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-[11px] font-bold">
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleGenerarQr} className="flex flex-col gap-4">
                            <div>
                                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1.5 mb-1.5">
                                    <Layers size={10} /> Tipo de Vector/Entidad
                                </label>
                                <select 
                                    value={tipoEntidad}
                                    onChange={(e) => { setTipoEntidad(e.target.value); setQrGenerado(false); }}
                                    className="w-full bg-zinc-950/80 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-yellow-500/30 transition-colors cursor-pointer"
                                >
                                    <option value="conductor">CONDUCTOR / MOTOTAXI</option>
                                    <option value="unidad">UNIDAD / PLACA FLOTA</option>
                                    <option value="despacho">NODO DE DESPACHO</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1.5 mb-1.5">
                                    <ShieldCheck size={10} /> Identificador Único (UID / Placa / ID)
                                </label>
                                <input 
                                    type="text"
                                    value={identificador}
                                    onChange={(e) => { setIdentificador(e.target.value); setQrGenerado(false); }}
                                    placeholder="Ej: MT-2026 o HMX-892"
                                    className="w-full bg-zinc-950/80 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/30 transition-colors uppercase"
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 active:scale-[0.98] disabled:opacity-50 text-yellow-500 font-bold uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Compilar Credencial Segura
                            </button>
                        </form>
                    </div>

                    <div className="border-t border-white/5 pt-4 mt-6 text-[8px] text-zinc-600 uppercase font-bold tracking-wider">
                        CIMCO-SECURITY PROTOCOL // Operador: {String(user?.email || 'SYSTEM_ROOT')}
                    </div>
                </div>

                {/* CONTENEDOR DE RENDIMIENTO DE VISTA PREVIA (QR TARGET) */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col items-center justify-center gap-6 min-h-[350px] relative">
                    {qrGenerado && identificador.trim() ? (
                        <div className="flex flex-col items-center gap-6 w-full animate-fadeIn">
                            <div 
                                ref={qrRef} 
                                className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/10"
                            >
                                <QRCodeSVG 
                                    value={targetUrlString}
                                    size={250}
                                    level="H" // Redundancia alta obligatoria para proteger la lectura con logo central
                                    includeMargin={false}
                                    imageSettings={{
                                        src: buildCentralLogoDataUrl(),
                                        x: undefined,
                                        y: undefined,
                                        height: 48,
                                        width: 110,
                                        excavate: true,
                                    }}
                                />
                            </div>

                            <div className="text-center px-4 w-full">
                                <h4 className="text-xs font-black uppercase tracking-widest text-white">
                                    TOKEN: {identificador.trim().toUpperCase()}
                                </h4>
                                <p className="text-[8px] text-zinc-500 font-mono break-all mt-1 bg-black/40 p-2 rounded-lg border border-white/5">
                                    {targetUrlString}
                                </p>
                            </div>

                            <button 
                                onClick={handleDescargarQr}
                                className="flex items-center gap-2 bg-zinc-950/80 hover:bg-zinc-900 border border-white/5 hover:border-white/10 px-6 py-2.5 rounded-xl text-[10px] font-bold text-zinc-300 uppercase tracking-widest transition-all duration-200"
                            >
                                <Download size={12} className="text-yellow-500" />
                                Exportar PNG de Alta Fidelidad
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6 flex flex-col items-center gap-3">
                            <Printer className="text-zinc-700 animate-pulse" size={40} />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Matriz en Espera</h3>
                            <p className="text-[9px] text-zinc-600 uppercase tracking-wider max-w-xs mt-1">
                                Ingrese los parámetros requeridos en el panel izquierdo para inyectar el vector QR.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QrGenerator;