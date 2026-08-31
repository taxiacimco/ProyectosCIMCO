// Versión Arquitectura: V24.2 - Exportación por Defecto Completa para Soporte de Carga Perezosa (React.lazy)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\QrGenerator.jsx
 * Misión: Generación de códigos QR de alta legibilidad con conmutación entre Entornos Locales y Producción (Vercel).
 * Ajuste V24.2: Asegurar la firma de exportación por defecto (export default QrGenerator) para garantizar compatibilidad atómica al ser importado mediante React.lazy() en el enrutador principal.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Download, RefreshCw, Loader, AlertTriangle, Printer, Layers, Eye, Trash2, Calendar, UserPlus, Globe, Laptop, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const QrGenerator = () => {
    const { user } = useAuth();
    const [rolSeleccionado, setRolSeleccionado] = useState('mototaxi');
    const [entorno, setEntorno] = useState('produccion'); // 'produccion' | 'local'
    const [qrGenerado, setQrGenerado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [historialQrs, setHistorialQrs] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const qrRef = useRef(null);

    // 🌐 DEFINICIÓN DE ENTORNOS DEDICADOS
    const URL_PRODUCCION = import.meta.env?.VITE_FRONTEND_URL_PROD || "https://frontend-opal-eight-58.vercel.app";
    
    const getUrlLocal = () => {
        try {
            if (import.meta.env?.VITE_FRONTEND_URL && !import.meta.env.VITE_FRONTEND_URL.includes('vercel.app')) {
                return import.meta.env.VITE_FRONTEND_URL.replace(/\/$/, '');
            }
            if (import.meta.env?.VITE_APP_BASE_URL) {
                return import.meta.env.VITE_APP_BASE_URL.replace(/\/$/, '');
            }
            if (typeof window !== 'undefined' && window.location?.origin) {
                return window.location.origin;
            }
        } catch (err) {
            console.warn("⚠️ Error obteniendo origen dinámico local:", err);
        }
        // Fallback robusto basado estrictamente en window.location.origin o dinámico sin IP estática hardcodeada
        return (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : "http://localhost:5173";
    };

    const baseUrlActiva = entorno === 'produccion' ? URL_PRODUCCION : getUrlLocal();

    const ROLES_CONTEXTO = {
        mototaxi: 'MOTOTAXI / OPERADOR',
        motoparrillero: 'MOTOPARRILLERO',
        motocarga: 'MOTOCARGA / ACARREOS',
        despachador: 'DESPACHADOR DE NODO',
        intermunicipal: 'TRANSPORTE INTERMUNICIPAL',
        pasajero: 'PASAJERO / USUARIO'
    };

    // Mapeo unificado a parámetros de acceso por rol
    const RUTAS_AMIGABLES_ROL = {
        mototaxi: '/login?role=mototaxi',
        motoparrillero: '/login?role=motoparrillero',
        motocarga: '/login?role=motocarga',
        despachador: '/login?role=despachador',
        intermunicipal: '/login?role=intermunicipal',
        pasajero: '/login?role=pasajero'
    };

    const getRutaDestinoRol = (role = rolSeleccionado, base = baseUrlActiva) => {
        const rolLimpio = (role || '').toString().trim().toLowerCase();
        const subRuta = RUTAS_AMIGABLES_ROL[rolLimpio] || `/login?role=${encodeURIComponent(rolLimpio)}`;
        const cleanBase = (base || '').toString().trim().replace(/\/$/, '');
        const rawUrl = `${cleanBase}${subRuta}`;

        try {
            const parsedUrl = new URL(rawUrl);
            return parsedUrl.toString();
        } catch (err) {
            console.error("❌ URL Malformada detectada en generador QR:", rawUrl, err);
            return `${URL_PRODUCCION}/login?role=${encodeURIComponent(rolLimpio)}`;
        }
    };

    const targetUrlString = getRutaDestinoRol();

    useEffect(() => {
        const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
        const q = query(collection(db, pathColeccion), orderBy('fechaCreacion', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const registros = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHistorialQrs(registros);
            setLoadingHistorial(false);
        }, (err) => {
            console.error("❌ Error en snapshot de bitácora QR:", err);
            setError("No se pudo sincronizar el historial de QRs con Firestore.");
            setLoadingHistorial(false);
        });

        return () => unsubscribe();
    }, []);

    const handleGenerarQrRol = async (e) => {
        e.preventDefault();
        
        if (!rolSeleccionado || !ROLES_CONTEXTO[rolSeleccionado]) {
            setError("Debe seleccionar un rol corporativo válido.");
            return;
        }

        const urlValidada = getRutaDestinoRol(rolSeleccionado, baseUrlActiva);
        if (!urlValidada || urlValidada.includes('undefined') || urlValidada.includes('null')) {
            setError("La URL del payload QR es inválida o no pudo ser construida de forma segura.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
            await addDoc(collection(db, pathColeccion), {
                entidadId: (rolSeleccionado || 'DESCONOCIDO').toUpperCase(),
                tipo: 'REGISTRO_ROL',
                entorno: (entorno || 'PRODUCCION').toUpperCase(),
                creadoPor: user?.email || 'CEO_ADMIN',
                fechaCreacion: serverTimestamp(),
                payloadUrl: urlValidada
            });

            setQrGenerado(true);
            setLoading(false);
        } catch (err) {
            console.error("❌ Error al salvar credencial institucional:", err);
            setError("Error de red: No se pudo registrar la configuración del QR en Firestore.");
            setLoading(false);
        }
    };

    const handleEliminarRegistro = async (idDoc) => {
        if (!idDoc) return;
        if (!window.confirm("¿Deseas dar de baja este QR institucional del historial de auditoría?")) return;
        try {
            const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
            await deleteDoc(doc(db, pathColeccion, idDoc));
        } catch (err) {
            console.error("❌ No se pudo remover el registro:", err);
        }
    };

    const handleCargarDesdeHistorial = (registro) => {
        if (registro && registro.entidadId) {
            const rolLower = registro.entidadId.toLowerCase();
            if (ROLES_CONTEXTO[rolLower]) {
                setRolSeleccionado(rolLower);
            }
            if (registro.payloadUrl?.includes('vercel.app')) {
                setEntorno('produccion');
            } else {
                setEntorno('local');
            }
            setQrGenerado(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDescargarQr = () => {
        try {
            const svgElement = qrRef.current?.querySelector('svg');
            if (!svgElement) return;

            const svgString = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const urlContext = window.URL || window.webkitURL || window;
            const blobURL = urlContext.createObjectURL(svgBlob);
            
            const image = new Image();
            image.onload = () => {
                // Pequeña diferición en event loop para resolver adecuadamente sub-recursos vectoriales
                setTimeout(() => {
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
                        downloadLink.download = `CIMCO_QR_${(entorno || 'PROD').toUpperCase()}_${(rolSeleccionado || 'ROL').toUpperCase()}.png`;
                        downloadLink.click();
                    }
                    urlContext.revokeObjectURL(blobURL);
                }, 100);
            };
            image.src = blobURL;
        } catch (err) {
            console.error("❌ Error exportando asset binario QR:", err);
        }
    };

    // 🎯 LOGO OPTIMIZADO Y MEMOIZADO PARA EVITAR RE-COMPUTAR O BLOQUEAR LA LECTURA DEL CÓDIGO QR
    const centralLogoDataUrl = useMemo(() => {
        const tag = (rolSeleccionado || 'CIMCO').substring(0, 4).toUpperCase();
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="120" height="50" viewBox="0 0 120 50">
                <rect width="100%" height="100%" fill="#121214" rx="8"/>
                <rect width="100%" height="100%" fill="none" stroke="#eab308" stroke-width="2" rx="8"/>
                <text x="50%" y="22" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">TAXIA</text>
                <text x="50%" y="38" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#eab308" text-anchor="middle">${tag}</text>
            </svg>
        `;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
    }, [rolSeleccionado]);

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto animate-in fade-in duration-300 font-sans selection:bg-amber-500 selection:text-black">
            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* FORMULARIO DE CONTROL DE ROLES Y ENTORNO */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <UserPlus size={20} className="text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Enrutamiento por Roles y Entornos</h2>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Estrategia Híbrida: Pruebas Locales y Producción Nube</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-[11px] font-bold">
                                <AlertTriangle size={14} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleGenerarQrRol} className="flex flex-col gap-5">
                            
                            {/* SELECTOR DE ENTORNO */}
                            <div>
                                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1.5 mb-2">
                                    <Globe size={10} /> Selecciona el Entorno Destino
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setEntorno('produccion'); setQrGenerado(false); }}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                            entorno === 'produccion'
                                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.15)]'
                                                : 'bg-zinc-950/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <Globe size={12} /> Producción (Vercel)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setEntorno('local'); setQrGenerado(false); }}
                                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                            entorno === 'local'
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                                                : 'bg-zinc-950/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        <Laptop size={12} /> Pruebas Locales (LAN)
                                    </button>
                                </div>
                            </div>

                            {/* SELECTOR DE ROL */}
                            <div>
                                <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-black flex items-center gap-1.5 mb-2">
                                    <Layers size={10} /> Selecciona el perfil destino del QR
                                </label>
                                <select 
                                    value={rolSeleccionado}
                                    onChange={(e) => { setRolSeleccionado(e.target.value); setQrGenerado(false); }}
                                    className="w-full bg-zinc-950/80 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-300 focus:outline-none focus:border-yellow-500/30 transition-colors"
                                >
                                    {Object.entries(ROLES_CONTEXTO).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-zinc-950/40 border border-white/5 p-3 rounded-xl space-y-1">
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    Generando QR para el rol <span className="text-yellow-500 font-bold uppercase">{rolSeleccionado}</span> en el entorno de <span className={entorno === 'produccion' ? 'text-yellow-400 font-bold uppercase' : 'text-blue-400 font-bold uppercase'}>{entorno}</span>.
                                </p>
                                {entorno === 'local' && (
                                    <p className="text-[9px] text-blue-400/80 font-mono">
                                        ⚠️ Nota: Los QR Locales requieren que el dispositivo esté en la misma red o usar la IP local dinámica detectada. Para calcomanías impresas utiliza Producción.
                                    </p>
                                )}
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 font-bold uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                                {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Generar Código QR [{entorno.toUpperCase()}]
                            </button>
                        </form>
                    </div>
                </div>

                {/* VISOR VECTORIAL */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col items-center justify-center gap-6 min-h-[350px]">
                    {qrGenerado ? (
                        <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in-95 duration-200">
                            <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-xl border border-white/10 flex items-center justify-center">
                                <QRCodeSVG 
                                    value={targetUrlString}
                                    size={240}
                                    level="H" 
                                    marginSize={2}
                                    imageSettings={{
                                        src: centralLogoDataUrl,
                                        height: 24,
                                        width: 54,
                                        excavate: true,
                                    }}
                                />
                            </div>
                            <div className="text-center px-4 w-full">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase flex items-center gap-1 ${entorno === 'produccion' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                        <CheckCircle2 size={10} /> ENTORNO: {entorno}
                                    </span>
                                </div>
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">PERFIL DESTINO: {(rolSeleccionado || '').toUpperCase()}</h4>
                                <p className="text-[8px] text-zinc-500 font-mono break-all mt-1 bg-black/40 p-2 rounded-lg border border-white/5 selection:bg-yellow-500 selection:text-black">{targetUrlString}</p>
                            </div>
                            <button onClick={handleDescargarQr} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-yellow-500/10">
                                <Download size={13} /> Guardar Calcomanía QR (PNG HD)
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6 flex flex-col items-center gap-2 text-zinc-500">
                            <Printer className="animate-pulse" size={32} />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Matriz de Rol en Espera</h3>
                            <p className="text-[10px] text-zinc-600">Selecciona el rol y haz clic en Generar para visualizar el QR</p>
                        </div>
                    )}
                </div>
            </div>

            {/* HISTORIAL Y AUDITORÍA */}
            <div className="backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Layers size={14} className="text-yellow-500" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200">Historial de Códigos QR de Reclutamiento</h3>
                    </div>
                    <span className="text-[9px] bg-zinc-950 px-2 py-0.5 rounded border border-white/5 font-mono text-zinc-500 uppercase">Matrices: {historialQrs.length}</span>
                </div>

                {loadingHistorial ? (
                    <div className="text-center py-8 text-zinc-500 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2">
                        <Loader size={12} className="animate-spin text-yellow-500" /> Leyendo base de datos local...
                    </div>
                ) : historialQrs.length === 0 ? (
                    <div className="text-center py-8 text-zinc-600 text-xs font-mono uppercase border border-dashed border-white/5 rounded-xl">No hay registros de códigos de captación guardados.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {historialQrs.map((item) => {
                            const esProd = item?.payloadUrl?.includes('vercel.app');
                            return (
                                <div key={item.id} className="bg-zinc-950/50 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-1.5 font-mono text-[9px]">
                                            <span className="px-1.5 py-0.5 rounded font-black uppercase bg-yellow-500/10 text-yellow-400">
                                                {item?.entidadId || 'N/A'}
                                            </span>
                                            <span className={`px-1 py-0.2 rounded font-black uppercase text-[8px] ${esProd ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                {esProd ? 'PROD' : 'LOCAL'}
                                            </span>
                                        </div>
                                        <p className="text-[8px] text-zinc-500 font-mono truncate max-w-[200px]">{item?.payloadUrl || 'N/A'}</p>
                                        <div className="flex items-center gap-1 text-[8px] text-zinc-600">
                                            <Calendar size={10} /> {item?.fechaCreacion?.toDate ? item.fechaCreacion.toDate().toLocaleDateString('es-CO') : 'Reciente'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => handleCargarDesdeHistorial(item)} title="Ver en Visor" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                                            <Eye size={12} />
                                        </button>
                                        <button onClick={() => handleEliminarRegistro(item.id)} title="Dar de baja" className="p-2 rounded-lg bg-red-500/5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QrGenerator;