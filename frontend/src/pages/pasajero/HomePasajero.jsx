// Versión Arquitectura: V8.1 - Módulo de Oferta con Iconos Dinámicos (Motocarga/Mototaxi)
/**
 * HomePasajero.jsx
 * Misión: Capturar oferta económica y mostrar en tiempo real al conductor 
 * con su icono personalizado (Mototaxi o Motocarga) usando Leaflet.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../config/firebase'; 
import { collection, addDoc, serverTimestamp, doc, onSnapshot, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// 1. 🛡️ CONFIGURACIÓN DE ICONOS PERSONALIZADOS CIBER-NEO-BRUTALISTAS
const DefaultIcon = L.icon({ 
    iconUrl: icon, 
    shadowUrl: iconShadow, 
    iconSize: [25, 41], 
    iconAnchor: [12, 41] 
});

const MototaxiIcon = L.icon({ 
    iconUrl: '/assets/mototaxi-192.png', 
    iconSize: [40, 40], 
    iconAnchor: [20, 40],
    className: 'border-2 border-black rounded-full bg-yellow-400' // Toque Brutalista
});

const MotocargaIcon = L.icon({ 
    iconUrl: '/assets/motocarga-192.png', 
    iconSize: [48, 48], // Un poco más grande para diferenciar peso
    iconAnchor: [24, 48],
    className: 'border-2 border-black rounded-sm bg-red-500' // Diferenciación de color
});

const HomePasajero = () => {
    const { user } = useAuth();
    const [position] = useState([9.566, -73.333]); // GPS Real de La Jagua
    const [viajeActual, setViajeActual] = useState(null);
    const [buscando, setBuscando] = useState(false);
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState("");
    const [calificacion, setCalificacion] = useState(0);

    // 📝 ESTADOS: Formulario de Viaje
    const [refRecogida, setRefRecogida] = useState("");
    const [refDestino, setRefDestino] = useState("");
    const [numPasajeros, setNumPasajeros] = useState(1);
    const [tarifaOfrecida, setTarifaOfrecida] = useState("");
    const [metodoPago, setMetodoPago] = useState("EFECTIVO");
    const [tipoServicio, setTipoServicio] = useState("mototaxi"); // Para elegir si es persona o carga

    useEffect(() => {
        if (!viajeActual?.id) return;
        const q = query(
            // REGLA DE ORO 1: Path Sagrado
            collection(db, `artifacts/taxiacimco-app/public/data/mensajes`),
            where("viajeId", "==", viajeActual.id),
            orderBy("timestamp", "asc")
        );
        return onSnapshot(q, (snapshot) => {
            setMensajes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [viajeActual?.id]);

    const solicitarServicio = async (e) => {
        e.preventDefault();
        if (!user) return alert("Error de sesión.");
        if (!tarifaOfrecida || tarifaOfrecida < 1000) return alert("Debes ofrecer una tarifa válida (mínimo $1000).");
        if (!refDestino) return alert("Por favor indica hacia dónde vas.");

        setBuscando(true);

        try {
            // REGLA DE ORO 1: Path Sagrado
            const pathViajes = `artifacts/taxiacimco-app/public/data/viajes`;
            const payload = {
                pasajeroId: user.uid,
                pasajeroNombre: user.displayName || "Pasajero CIMCO",
                estado: 'BUSCANDO',
                tipoServicio: tipoServicio, // 'mototaxi' o 'motocarga'
                ubicacionRecogida: { lat: position[0], lng: position[1] }, 
                detallesManuales: {
                    recogida: refRecogida || "Ubicación GPS",
                    destino: refDestino,
                    pasajeros: parseInt(numPasajeros)
                },
                pago: {
                    tarifaOfertada: parseInt(tarifaOfrecida),
                    metodo: metodoPago
                },
                createdAt: serverTimestamp(),
                origen: "La Jagua Centro"
            };

            const docRef = await addDoc(collection(db, pathViajes), payload);
            
            onSnapshot(doc(db, pathViajes, docRef.id), (snapshot) => {
                const data = snapshot.data();
                if (data) setViajeActual({ id: snapshot.id, ...data });
                if (data?.estado === 'ACEPTADO') setBuscando(false);
            });

        } catch (error) {
            console.error("Error:", error);
            setBuscando(false);
            alert("Error al solicitar el viaje.");
        }
    };

    const enviarMensaje = async (e) => {
        e.preventDefault();
        if (!nuevoMensaje.trim()) return;
        await addDoc(collection(db, `artifacts/taxiacimco-app/public/data/mensajes`), {
            viajeId: viajeActual.id, senderId: user.uid, texto: nuevoMensaje,
            timestamp: serverTimestamp(), rol: 'PASAJERO'
        });
        setNuevoMensaje("");
    };

    const finalizarConCalificacion = async () => {
        const viajeRef = doc(db, `artifacts/taxiacimco-app/public/data/viajes`, viajeActual.id);
        await updateDoc(viajeRef, { calificacion, estado: 'COMPLETADO_HISTORIAL' });
        setViajeActual(null);
        setCalificacion(0);
        setRefRecogida(""); setRefDestino(""); setTarifaOfrecida("");
    };

    // 2. 🛡️ FUNCIÓN RESOLUTORA DE ICONOS
    const getDriverIcon = (conductorRol) => {
        if (conductorRol === 'motocarga') return MotocargaIcon;
        return MototaxiIcon;
    };

    return (
        <div style={styles.wrapper}>
            <div style={styles.mapContainer}>
                <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={position} icon={DefaultIcon}><Popup>Tu GPS Exacto</Popup></Marker>
                    
                    {/* Renderizado Dinámico del Conductor en el Mapa */}
                    {viajeActual?.conductorUbicacion && (
                        <Marker 
                            position={[viajeActual.conductorUbicacion.lat, viajeActual.conductorUbicacion.lng]} 
                            icon={getDriverIcon(viajeActual.conductorRol || viajeActual.tipoServicio)} 
                        >
                            <Popup>{viajeActual.conductorRol === 'motocarga' ? 'Motocarga en Camino' : 'Mototaxi en Camino'}</Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            <div style={styles.bottomPanel}>
                {!viajeActual && !buscando && (
                    <form onSubmit={solicitarServicio} style={styles.formContainer}>
                        <div style={styles.headerForm}>
                            <h3 style={styles.formTitle}>DETALLES DEL SERVICIO</h3>
                            
                            {/* Selector de Tipo de Servicio */}
                            <select value={tipoServicio} onChange={e => setTipoServicio(e.target.value)} style={styles.serviceSelect}>
                                <option value="mototaxi">🏍️ Viaje (Mototaxi)</option>
                                <option value="motocarga">🛻 Flete (Motocarga)</option>
                            </select>
                        </div>
                        
                        <input value={refRecogida} onChange={e => setRefRecogida(e.target.value)} placeholder="Referencia de Recogida (Opcional)" style={styles.inputForm} />
                        <input value={refDestino} onChange={e => setRefDestino(e.target.value)} placeholder="¿A dónde vas? (Ej: Parque Principal)" required style={styles.inputForm} />
                        
                        <div style={styles.row}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>{tipoServicio === 'motocarga' ? 'AYUDANTES' : 'PASAJEROS'}</label>
                                <input type="number" min="1" max="2" value={numPasajeros} onChange={e => setNumPasajeros(e.target.value)} style={styles.inputForm} />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>PAGO EN</label>
                                <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} style={styles.inputForm}>
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="BILLETERA">Billetera App</option>
                                </select>
                            </div>
                        </div>

                        <div style={styles.offerBox}>
                            <label style={styles.labelOffer}>¿CUÁNTO OFRECES PAGAR?</label>
                            <div style={styles.offerInputWrapper}>
                                <span style={styles.currencySign}>$</span>
                                <input type="number" min="1000" value={tarifaOfrecida} onChange={e => setTarifaOfrecida(e.target.value)} placeholder="5000" required style={styles.inputOffer} />
                            </div>
                        </div>

                        <button type="submit" style={styles.requestBtn}>
                            OFERTAR {tipoServicio === 'motocarga' ? 'FLETE' : 'VIAJE'}
                        </button>
                    </form>
                )}

                {buscando && (
                    <div style={styles.waitingBox}>
                        <h3 className="animate-pulse">⏳ BUSCANDO {tipoServicio.toUpperCase()}...</h3>
                        <p>Ofreciste: <strong>${tarifaOfrecida}</strong></p>
                    </div>
                )}

                {viajeActual?.estado === 'ACEPTADO' && (
                    <div style={styles.activeArea}>
                        <div style={styles.badgeInfo}>
                            {viajeActual.tipoServicio === 'motocarga' ? '🛻' : '🏍️'} {viajeActual.conductorNombre} ACEPTÓ TU TARIFA DE ${viajeActual.pago?.tarifaOfertada}
                        </div>
                        <div style={styles.chatBox}>
                            {mensajes.map(m => (
                                <div key={m.id} style={m.senderId === user.uid ? styles.msgPasajero : styles.msgConductor}>{m.texto}</div>
                            ))}
                        </div>
                        <form onSubmit={enviarMensaje} style={styles.chatInputForm}>
                            <input value={nuevoMensaje} onChange={(e)=>setNuevoMensaje(e.target.value)} placeholder="Mensaje al conductor..." style={styles.chatInput}/>
                            <button type="submit" style={styles.sendBtn}>➤</button>
                        </form>
                    </div>
                )}

                {viajeActual?.estado === 'FINALIZADO' && (
                    <div style={styles.ratingCard}>
                        <h3>Pago acordado: ${viajeActual.pago?.tarifaOfertada} ({viajeActual.pago?.metodo})</h3>
                        <p>¿Cómo fue el servicio con {viajeActual.conductorNombre}?</p>
                        <div style={styles.stars}>
                            {[1,2,3,4,5].map(num => (
                                <span key={num} onClick={() => setCalificacion(num)} style={{...styles.star, color: calificacion >= num ? '#1a1a1a' : '#fff', textShadow: '2px 2px 0 #000'}}>★</span>
                            ))}
                        </div>
                        <button onClick={finalizarConCalificacion} style={styles.ratingBtn}>FINALIZAR</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    wrapper: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#000', fontFamily: 'monospace' },
    mapContainer: { flex: 1, zIndex: 1 },
    bottomPanel: { padding: '20px', backgroundColor: '#0a0a0a', borderTop: '8px solid #facc15', overflowY: 'auto', maxHeight: '55vh', zIndex: 1000 },
    formContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
    headerForm: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    formTitle: { margin: '0', fontSize: '18px', fontWeight: '900', color: '#fff', textTransform: 'uppercase', fontStyle: 'italic' },
    serviceSelect: { padding: '5px', backgroundColor: '#facc15', color: '#000', fontWeight: 'bold', border: '2px solid #000', outline: 'none' },
    inputForm: { padding: '12px', border: '3px solid #3f3f46', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', fontSize: '12px', width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' },
    row: { display: 'flex', gap: '10px' },
    inputGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '10px', fontWeight: '900', color: '#facc15', textTransform: 'uppercase' },
    offerBox: { backgroundColor: '#facc15', padding: '15px', border: '4px solid #000', marginTop: '5px' },
    labelOffer: { fontSize: '14px', fontWeight: '900', color: '#000', display: 'block', marginBottom: '5px' },
    offerInputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '3px solid #000' },
    currencySign: { padding: '10px', fontSize: '20px', fontWeight: '900', backgroundColor: '#000', color: '#facc15' },
    inputOffer: { flex: 1, padding: '10px', border: 'none', fontSize: '20px', fontWeight: '900', outline: 'none', color: '#000' },
    requestBtn: { width: '100%', padding: '18px', backgroundColor: '#facc15', color: '#000', fontWeight: '900', fontSize: '18px', border: '4px solid #000', boxShadow: '6px 6px 0px #fff', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase' },
    waitingBox: { textAlign: 'center', padding: '20px', backgroundColor: '#000', color: '#facc15', fontWeight: 'bold', border: '4px solid #facc15' },
    activeArea: { display: 'flex', flexDirection: 'column', gap: '10px' },
    badgeInfo: { backgroundColor: '#facc15', color: '#000', padding: '10px', fontWeight: '900', textAlign: 'center', fontSize: '12px', border: '2px solid #000' },
    chatBox: { height: '150px', overflowY: 'auto', border: '3px solid #3f3f46', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', backgroundColor: '#000' },
    msgPasajero: { alignSelf: 'flex-end', backgroundColor: '#facc15', color: '#000', padding: '8px 12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', boxShadow: '3px 3px 0px #fff' },
    msgConductor: { alignSelf: 'flex-start', backgroundColor: '#3f3f46', color: '#fff', padding: '8px 12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', boxShadow: '3px 3px 0px #facc15' },
    chatInputForm: { display: 'flex', gap: '5px', marginTop: '5px' },
    chatInput: { flex: 1, padding: '10px', border: '3px solid #3f3f46', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', outline: 'none' },
    sendBtn: { backgroundColor: '#facc15', color: '#000', border: '2px solid #000', width: '50px', fontWeight: '900' },
    ratingCard: { textAlign: 'center', backgroundColor: '#facc15', padding: '20px', border: '4px solid #000', boxShadow: '8px 8px 0px #fff' },
    stars: { fontSize: '40px', cursor: 'pointer', margin: '10px 0' },
    ratingBtn: { width: '100%', padding: '15px', backgroundColor: '#000', color: '#facc15', fontWeight: '900', border: 'none', textTransform: 'uppercase' }
};

export default HomePasajero;