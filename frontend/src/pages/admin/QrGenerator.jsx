// Versión Arquitectura: V23.1 - Parametrización Dinámica de URL Base para Entornos Híbridos y Producción
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\pages\admin\QrGenerator.jsx
 * Misión: Generación de códigos QR de reclutamiento institucional que redirigen a las vistas de registro/login parametrizadas por rol.
 * Estilo: CIMCO-UI V9.3 Dark Mode Premium Glassmorphism (Identidad Amarilla).
 * Ajuste V23.1: Enrutamiento dinámico de PRODUCCION_BASE_URL mediante import.meta.env.VITE_FRONTEND_URL con fallback a window.location.origin.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { QrCode, Download, RefreshCw, ShieldCheck, Loader, AlertTriangle, Printer, Layers, Eye, Trash2, Calendar, UserPlus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const QrGenerator = () => {
    const { user } = useAuth();
    const [rolSeleccionado, setRolSeleccionado] = useState('mototaxi');
    const [qrGenerado, setQrGenerado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [historialQrs, setHistorialQrs] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(true);
    const qrRef = useRef(null);

    // 🌐 BASE URL DINÁMICA: Toma la variable VITE_FRONTEND_URL del .env o el origen del navegador
    const PRODUCCION_BASE_URL = (import.meta.env.VITE_FRONTEND_URL || window.location.origin).replace(/\/$/, '');

    // Diccionario de Roles del Ecosistema TAXIA CIMCO con sus etiquetas legibles
    const ROLES_CONTEXTO = {
        mototaxi: 'MOTOTAXI / OPERADOR',
        motoparrillero: 'MOTOPARRILLERO',
        motocarga: 'MOTOCARGA / ACARREOS',
        despachador: 'DESPACHADOR DE NODO',
        intermunicipal: 'TRANSPORTE INTERMUNICIPAL',
        pasajero: 'PASAJERO / USUARIO'
    };

    // Construye la URL de enrutamiento asignando el parámetro de rol para que la vista de Auth lo procese
    const getRutaDestinoRol = (role = rolSeleccionado) => {
        const rolLimpio = (role || '').trim().toLowerCase();
        return `${PRODUCCION_BASE_URL}/register?role=${rolLimpio}`;
    };

    const targetUrlString = getRutaDestinoRol();

    // Sincronización en tiempo real con Firestore de la bitácora de códigos institucionales
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
            setLoadingHistorial(false);
        });

        return () => unsubscribe();
    }, []);

    const handleGenerarQrRol = async (e) => {
        e.preventDefault();
        if (!rolSeleccionado) {
            setError("Debe seleccionar un rol corporativo válido.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const pathColeccion = FIRESTORE_PATHS?.qrs || 'qrs';
            await addDoc(collection(db, pathColeccion), {
                entidadId: rolSeleccionado.toUpperCase(),
                tipo: 'REGISTRO_ROL',
                creadoPor: user?.email || 'CEO_ADMIN',
                fechaCreacion: serverTimestamp(),
                payloadUrl: targetUrlString
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
        if (registro && registro.entidadId && ROLES_CONTEXTO[registro.entidadId.toLowerCase()]) {
            setRolSeleccionado(registro.entidadId.toLowerCase());
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
                    downloadLink.download = `CIMCO_REGISTRO_${(rolSeleccionado || '').toUpperCase()}.png`;
                    downloadLink.click();
                }
                urlContext.revokeObjectURL(blobURL);
            };
            image.src = blobURL;
        } catch (err) {
            console.error("❌ Error exportando asset binario QR:", err);
        }
    };

    const buildCentralLogoDataUrl = () => {
        const tag = (rolSeleccionado || 'CIMCO').substring(0, 4).toUpperCase();
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="180" height="75" viewBox="0 0 180 75">
                <rect width="100%" height="100%" fill="#121214" rx="12"/>
                <rect width="100%" height="100%" fill="none" stroke="#eab308" stroke-width="3" rx="12"/>
                <text x="50%" y="32" font-family="monospace" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">TAXIA CIMCO</text>
                <text x="50%" y="58" font-family="monospace" font-size="15" font-weight="900" fill="#eab308" text-anchor="middle" letter-spacing="2">[${tag}]</text>
            </svg>
        `;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
    };

    return (
        <div className="space-y-6 w-full max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="flex flex-col lg:flex-row gap-6">
                
                {/* FORMULARIO DE CONTROL DE ROLES */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                                <UserPlus size={20} className="text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-200">Enrutamiento Estático por Roles</h2>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Estrategia de Reclutamiento de Usuarios y Flotas</p>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-[11px] font-bold">
                                <AlertTriangle size={14} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleGenerarQrRol} className="flex flex-col gap-5">
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

                            <div className="bg-zinc-950/40 border border-white/5 p-3 rounded-xl">
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                                    Al escanear esta matriz, el dispositivo móvil abrirá directamente el flujo corporativo de registro preconfigurando la interfaz para el perfil <span className="text-yellow-500 font-bold uppercase">{rolSeleccionado}</span>.
                                </p>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-500 font-bold uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                                {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Compilar Matriz de Captación QR
                            </button>
                        </form>
                    </div>
                </div>

                {/* VISOR VECTORIAL EN CALIENTE */}
                <div className="flex-1 backdrop-blur-md bg-[#121214]/60 rounded-3xl p-6 border border-white/5 shadow-lg flex flex-col items-center justify-center gap-6 min-h-[350px]">
                    {qrGenerado ? (
                        <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in-95 duration-200">
                            <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-xl border border-white/10">
                                <QRCodeSVG 
                                    value={targetUrlString}
                                    size={220}
                                    level="H" 
                                    imageSettings={{
                                        src: buildCentralLogoDataUrl(),
                                        height: 44,
                                        width: 100,
                                        excavate: true,
                                    }}
                                />
                            </div>
                            <div className="text-center px-4 w-full">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest">PERFIL DESTINO: {(rolSeleccionado || '').toUpperCase()}</h4>
                                <p className="text-[8px] text-zinc-500 font-mono break-all mt-1 bg-black/40 p-2 rounded-lg border border-white/5">{targetUrlString}</p>
                            </div>
                            <button onClick={handleDescargarQr} className="flex items-center gap-2 bg-zinc-950 border border-white/5 px-5 py-2 rounded-xl text-[10px] font-bold text-zinc-300 uppercase tracking-widest transition-all hover:text-white">
                                <Download size={12} className="text-yellow-500" /> Guardar Calcomanía QR (PNG)
                            </button>
                        </div>
                    ) : (
                        <div className="text-center p-6 flex flex-col items-center gap-2 text-zinc-500">
                            <Printer className="animate-pulse" size={32} />
                            <h3 className="text-xs font-bold uppercase tracking-widest">Matriz de Rol en Espera</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* HISTORIAL Y AUDITORÍA DE MATRICES EMITIDAS */}
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
                        {historialQrs.map((item) => (
                          <div key={item.id} className="bg-zinc-950/50 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
                              <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-1.5 font-mono text-[9px]">
                                      <span className="px-1.5 py-0.5 rounded font-black uppercase bg-yellow-500/10 text-yellow-400">
                                          {item.entidadId || 'N/A'}
                                      </span>
                                  </div>
                                  <p className="text-[8px] text-zinc-500 font-mono truncate max-w-[200px]">{item.payloadUrl}</p>
                                  <div className="flex items-center gap-1 text-[8px] text-zinc-600">
                                      <Calendar size={10} /> {item.fechaCreacion?.toDate ? item.fechaCreacion.toDate().toLocaleDateString('es-CO') : 'Reciente'}
                                  </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => handleCargarDesdeHistorial(item)} title="Ver en Visor" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                                      <Eye size={12} />
                                  </button>
                                  <button onClick={() => handleEliminarRegistro(item.id)} title="Dar de baja" className="p-2 rounded-lg bg-red-500/5 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                          </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QrGenerator;