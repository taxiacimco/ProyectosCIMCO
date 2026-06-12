// Versión Arquitectura: V11.6 - Despliegue Atómico de Calificaciones NoSQL y Gobernanza de Rutas FIRESTORE_PATHS
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\components\ModalCalificacion.jsx
 * Misión: Desplegar el modal premium de calificación (Glassmorphism CIMCO-UI V9.3),
 * preservar el guardado en el nodo de viajes histórico y persistir la nueva topología
 * atómica en la colección descentralizada de /calificaciones sin generar bloqueos.
 * UI Standard: CIMCO-UI V9.3 Pure Glassmorphism (backdrop-blur-xl, bg-[#121214]/80, border-white/5).
 */

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquare, Tag, X } from 'lucide-react';
import { db as globalDb, FIRESTORE_PATHS } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';

const ModalCalificacion = ({ 
    isOpen, 
    idViaje, 
    rolUsuario, 
    onFinalizarCalificacion, 
    db: propDb, 
    pathViajes 
}) => {
    // 🛡️ Gobernanza de dependencias: Prioriza importación global configurada con Alias @ o usa props como fallback
    const db = propDb || globalDb;
    const { user } = useAuth();

    // Estados locales reactivos para el feedback estructurado
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comentarios, setComentarios] = useState('');
    const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([]);
    const [enviando, setEnviando] = useState(false);
    const [errorOperativo, setErrorOperativo] = useState('');

    // Bancos de etiquetas predefinidos según el ecosistema operativo de TAXIA CIMCO
    const ETIQUETAS_DISPONIBLES = rolUsuario === 'pasajero' 
        ? ["Amable", "Rápido", "Seguro", "Excelente Manejo", "Moto Limpia"]
        : ["Buen Pasajero", "Puntual", "Respetuoso", "Pago Exacto"];

    // Ciclo de vida: Limpieza total de búfer de entrada al abrir o cerrar el modal
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

    // Manejador de selección múltiple de cualidades operativas
    const toggleEtiqueta = (tag) => {
        if (etiquetasSeleccionadas.includes(tag)) {
            setEtiquetasSeleccionadas(etiquetasSeleccionadas.filter(t => t !== tag));
        } else {
            setEtiquetasSeleccionadas([...etiquetasSeleccionadas, tag]);
        }
    };

    const enviarCalificacion = async () => {
        // 🛡️ Guardas de Seguridad Proactivas (Anti-Undefined)
        if (!idViaje) {
            setErrorOperativo("Error de Red: ID del viaje no identificado.");
            return;
        }
        if (rating === 0) {
            setErrorOperativo("Por favor selecciona al menos 1 estrella antes de enviar.");
            return;
        }

        setEnviando(true);
        setErrorOperativo('');

        try {
            // 📡 Gobernanza de Rutas: Consumo mandatorio de rutas centralizadas
            const rutaViajeColeccion = pathViajes || FIRESTORE_PATHS?.viajes || 'viajes';
            const rutaCalificacionesColeccion = FIRESTORE_PATHS?.calificaciones || 'calificaciones';

            const viajeRef = doc(db, rutaViajeColeccion, idViaje);
            
            // 🛡️ Blindaje de Variables: Extracción en tiempo real del receptor del feedback para evitar spoofeos
            let receptorId = "DESCONOCIDO";
            const viajeSnap = await getDoc(viajeRef);
            
            if (viajeSnap.exists()) {
                const viajeData = viajeSnap.data();
                if (rolUsuario === 'pasajero') {
                    receptorId = viajeData.conductorId || viajeData.idConductor || "DESCONOCIDO";
                } else {
                    receptorId = viajeData.pasajeroId || viajeData.usuarioId || "DESCONOCIDO";
                }
            }

            // 🚀 OPERACIÓN 1: Fusión Atómica - Preservar de forma exacta la actualización del documento de viaje legacy
            const campoUpdate = rolUsuario === 'pasajero' 
                ? { calificacionAlConductor: rating } 
                : { calificacionAlPasajero: rating };
            
            await updateDoc(viajeRef, campoUpdate);

            // 🚀 OPERACIÓN 2: Persistencia del modelo relacional NoSQL descentralizado
            const documentoCalificacion = {
                viajeId: idViaje,
                evaluadorId: user?.uid || "ANÓNIMO",
                evaluadorRol: rolUsuario || "pasajero",
                receptorId: receptorId,
                puntuacion: rating,
                comentarios: comentarios.trim(),
                etiquetas: etiquetasSeleccionadas,
                fechaCreacion: serverTimestamp()
            };

            const calificacionesRef = collection(db, rutaCalificacionesColeccion);
            await addDoc(calificacionesRef, documentoCalificacion);

            // Cierre exitoso y limpieza de la consola del consumidor
            onFinalizarCalificacion();
        } catch (error) {
            console.error("❌ Error Crítico en ModalCalificacion Engine:", error);
            setErrorOperativo("Fallo de comunicación con Firestore. Reintente el envío.");
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity duration-300">
            {/* Contenedor Principal bajo Estándar Glassmorphism CIMCO V9.3 */}
            <div className="w-full max-w-md backdrop-blur-xl bg-[#121214]/80 border border-white/5 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.6)] font-mono text-zinc-100 flex flex-col gap-5 relative">
                
                {/* Control de Escape Rápido */}
                <button 
                    onClick={onFinalizarCalificacion}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors p-1 bg-transparent border-0 cursor-pointer"
                    disabled={enviando}
                >
                    <X size={18} />
                </button>

                {/* Encabezado Técnico */}
                <div className="text-center space-y-1">
                    <h2 className="text-sm font-black uppercase tracking-widest text-yellow-500">
                        Calificar Servicio
                    </h2>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                        Tu feedback consolida la reputación en la red de transportes
                    </p>
                </div>

                {/* Consola de Errores Operativos */}
                {errorOperativo && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-3 rounded-xl uppercase font-bold text-center tracking-wide">
                        {errorOperativo}
                    </div>
                )}

                {/* Panel de Estrellas Interactivo */}
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
                                    size={36}
                                    className={`transition-all duration-150 ${
                                        valorEstrella <= (hover || rating)
                                            ? 'text-yellow-500 fill-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                                            : 'text-zinc-700'
                                    }`}
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Selector de Etiquetas (Chips de Rendimiento) */}
                <div className="space-y-2">
                    <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <Tag size={12} className="text-yellow-500" /> Atributos clave del servicio:
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
                                            : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Cuadro de Mensajería Escrita */}
                <div className="space-y-2">
                    <label className="text-[9px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <MessageSquare size={12} className="text-cyan-400" /> Reseña u observaciones:
                    </label>
                    <textarea
                        value={comentarios}
                        onChange={(e) => setComentarios(e.target.value)}
                        placeholder="Describe de forma breve los detalles del trayecto..."
                        maxLength={150}
                        disabled={enviando}
                        className="w-full min-h-[70px] max-h-[90px] bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/40 font-mono resize-none transition-colors"
                    />
                </div>

                {/* Disparador de Transacción Maestra */}
                <button
                    onClick={enviarCalificacion}
                    disabled={enviando || rating === 0}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.2)] border-0 cursor-pointer"
                >
                    <CheckCircle size={14} /> 
                    {enviando ? 'PROCESANDO ATÓMICAMENTE...' : 'ENVIAR CALIFICACIÓN'}
                </button>
            </div>
        </div>
    );
};

export default ModalCalificacion;