// Versión Arquitectura: V12.0 - PROD READY: Atomización Verdadera por Lógica de Batches NoSQL y Blindaje de Sanitización String
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\ModalCalificacion.jsx
 * Misión: Desplegar modal de calificación y persistir de manera estrictamente atómica (All-or-Nothing) 
 * tanto el cambio en el documento de viaje legado como la nueva topología relacional en /calificaciones.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism (backdrop-blur-xl, bg-[#121214]/80, border-white/5).
 */

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquare, Tag, X, AlertTriangle } from 'lucide-react';
import { db as globalDb, FIRESTORE_PATHS } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { doc, collection, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';

const ModalCalificacion = ({ 
    isOpen, 
    idViaje, 
    rolUsuario, 
    onFinalizarCalificacion, 
    db: propDb, 
    pathViajes 
}) => {
    const db = propDb || globalDb;
    const { user } = useAuth();

    // Estados locales reactivos
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comentarios, setComentarios] = useState('');
    const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [errorOperativo, setErrorOperativo] = useState('');

    const ETIQUETAS_DISPONIBLES = rolUsuario === 'pasajero' 
        ? ["Amable", "Rápido", "Seguro", "Excelente Manejo", "Moto Limpia"]
        : ["Buen Pasajero", "Puntual", "Respetuoso", "Pago Exacto"];

    // Ciclo de vida: Saneamiento total del búfer al conmutar visibilidad
    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHover(0);
            setComentarios('');
            setEtiquetasSeleccionadas([]);
            setErrorOperativo('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleEtiqueta = (tag) => {
        if (etiquetasSeleccionadas.includes(tag)) {
            setEtiquetasSeleccionadas(etiquetasSeleccionadas.filter(t => t !== tag));
        } else {
            setEtiquetasSeleccionadas([...etiquetasSeleccionadas, tag]);
        }
    };

    const enviarCalificacion = async () => {
        if (!idViaje) {
            setErrorOperativo("ID del viaje no identificado por el Core.");
            return;
        }
        if (rating === 0) {
            setErrorOperativo("Selecciona al menos 1 estrella para registrar tu evaluación.");
            return;
        }

        setEnviando(true);
        setErrorOperativo('');

        try {
            const rutaViajeColeccion = pathViajes || FIRESTORE_PATHS?.viajes || 'viajes';
            const rutaCalificacionesColeccion = FIRESTORE_PATHS?.calificaciones || 'calificaciones';

            const viajeRef = doc(db, rutaViajeColeccion, idViaje);
            
            // 🛡️ Extracción en tiempo real del receptor para evitar vulnerabilidades de spoofing
            let receptorId = "DESCONOCIDO";
            const viajeSnap = await getDoc(viajeRef);
            
            if (viajeSnap.exists()) {
                const viajeData = viajeSnap.data();
                receptorId = rolUsuario === 'pasajero'
                    ? (viajeData.conductorId || viajeData.idConductor || "DESCONOCIDO")
                    : (viajeData.pasajeroId || viajeData.usuarioId || "DESCONOCIDO");
            } else {
                throw new Error("El viaje de referencia fue purgado del servidor.");
            }

            // 🚀 INICIALIZACIÓN DE BATCH EN FIREBASE (Garantiza transaccionalidad All-or-Nothing)
            const batch = writeBatch(db);

            // Operación 1: Preparar la mutación del documento del viaje legacy
            const campoUpdate = rolUsuario === 'pasajero' 
                ? { calificacionAlConductor: rating } 
                : { calificacionAlPasajero: rating };
            batch.update(viajeRef, campoUpdate);

            // Operación 2: Generar referencia con ID autogenerado para el nuevo documento descentralizado
            const nuevaCalificacionRef = doc(collection(db, rutaCalificacionesColeccion));
            const documentoCalificacion = {
                viajeId: idViaje,
                evaluadorId: user?.uid || "ANÓNIMO",
                evaluadorRol: rolUsuario || "pasajero",
                receptorId: receptorId,
                puntuacion: rating,
                comentarios: comentarios.trim().substring(0, 150), // 🛡️ Truncado preventivo estricto
                etiquetas: etiquetasSeleccionadas,
                fechaCreacion: serverTimestamp()
            };
            batch.set(nuevaCalificacionRef, documentoCalificacion);

            // ⚡ Disparo Único del Batch a la Red
            await batch.commit();

            onFinalizarCalificacion();
        } catch (error) {
            console.error("❌ [CIMCO-RATING-ENGINE] Fallo crítico de mutación transaccional:", error);
            setErrorOperativo(error.message.includes("purgado") 
                ? error.message 
                : "Error de red: No se pudo consolidar la calificación en el Libro Mayor."
            );
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md backdrop-blur-xl bg-[#121214]/90 border border-white/10 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] font-mono text-zinc-100 flex flex-col gap-5 relative">
                
                <button 
                    onClick={onFinalizarCalificacion}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors p-1 bg-transparent border-0 cursor-pointer"
                    disabled={enviando}
                >
                    <X size={16} />
                </button>

                <div className="text-center space-y-1">
                    <h2 className="text-xs font-black uppercase tracking-widest text-yellow-500">
                        Calificar Servicio
                    </h2>
                    <p className="text-[9px] text-zinc-400 uppercase tracking-wider leading-normal">
                        Tu feedback consolida la reputación en la red de transportes
                    </p>
                </div>

                {errorOperativo && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] p-3 rounded-xl uppercase font-bold text-center tracking-wide flex items-center justify-center gap-2">
                        <AlertTriangle size={12} className="shrink-0" />
                        {errorOperativo}
                    </div>
                )}

                <div className="flex justify-center items-center gap-3 py-1">
                    {[...Array(5)].map((_, indice) => {
                        const valorEstrella = indice + 1;
                        return (
                            <button
                                type="button"
                                key={valorEstrella}
                                className="transition-transform active:scale-95 hover:scale-110 outline-none bg-transparent border-0 cursor-pointer p-0"
                                onClick={() => setRating(valorEstrella)}
                                onMouseEnter={() => setHover(valorEstrella)}
                                onMouseLeave={() => setHover(0)}
                                disabled={enviando}
                            >
                                <Star
                                    size={32}
                                    className={`transition-all duration-150 ${
                                        valorEstrella <= (hover || rating)
                                            ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                                            : 'text-zinc-800'
                                    }`}
                                />
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <Tag size={11} className="text-yellow-500" /> Atributos clave del servicio:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {ETIQUETAS_DISPONIBLES.map((tag) => {
                            const seleccionado = etiquetasSeleccionadas.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleEtiqueta(tag)}
                                    disabled={enviando}
                                    className={`text-[9px] font-bold uppercase py-1.5 px-3 rounded-lg border transition-all tracking-wider cursor-pointer ${
                                        seleccionado
                                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.15)]'
                                            : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-zinc-700'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <MessageSquare size={11} className="text-cyan-400" /> Reseña u observaciones:
                        </label>
                        <span className="text-[8px] font-mono text-zinc-600 font-bold">{comentarios.length}/150</span>
                    </div>
                    <textarea
                        value={comentarios}
                        onChange={(e) => setComentarios(e.target.value)}
                        placeholder="Describe de forma breve los detalles del trayecto..."
                        maxLength={150}
                        disabled={enviando}
                        className="w-full min-h-[70px] max-h-[90px] bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-cyan-500/40 font-mono resize-none transition-colors"
                    />
                </div>

                <button
                    onClick={enviarCalificacion}
                    disabled={enviando || rating === 0}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.2)] border-0 cursor-pointer"
                >
                    <CheckCircle size={14} /> 
                    {enviando ? 'COMPROMETIENDO BATCH...' : 'CONSOLIDAR EVALUACIÓN'}
                </button>
            </div>
        </div>
    );
};

export default ModalCalificacion;