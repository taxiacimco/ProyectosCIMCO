import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const ChatViaje = ({ viajeId, rol }) => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const scrollRef = useRef();
  
  // REFERENCIA PARA EL AUDIO (Ruta según tu estructura: /js/sounds/notify.mp3)
  const audioRef = useRef(new Audio('/js/sounds/notify.mp3'));

  useEffect(() => {
    if (!viajeId) return;

    const q = query(
      collection(db, "viajes_solicitados", viajeId, "chats"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = [];
      let hayNuevoMensajeExterno = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Solo sonar si el mensaje NO es mío y NO es una carga inicial (metadata)
          if (data.remitente !== rol && !snapshot.metadata.hasPendingWrites) {
            hayNuevoMensajeExterno = true;
          }
        }
      });

      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      setMensajes(msgs);

      // ACTIVAR ALERTAS SI HAY MENSAJE NUEVO
      if (hayNuevoMensajeExterno) {
        reproducirAlerta();
      }

      // Auto-scroll al último mensaje
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [viajeId, rol]);

  // Función para manejar Sonido y Vibración
  const reproducirAlerta = () => {
    // 1. Sonido
    audioRef.current.play().catch(err => console.log("Interacción requerida para audio"));
    
    // 2. Vibración (Patrón corto: 100ms vibrar, 50ms esperar, 100ms vibrar)
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    try {
      await addDoc(collection(db, "viajes_solicitados", viajeId, "chats"), {
        texto: nuevoMensaje,
        remitente: rol,
        uid: auth.currentUser.uid,
        timestamp: serverTimestamp()
      });
      setNuevoMensaje("");
    } catch (error) {
      console.error("Error al enviar:", error);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-64 shadow-2xl">
      <div className="bg-slate-700 p-2 text-[10px] font-black uppercase text-center text-gray-400">
        Chat con el {rol === 'pasajero' ? 'Conductor' : 'Pasajero'}
      </div>
      
      {/* Caja de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {mensajes.map((m) => (
          <div key={m.id} className={`flex ${m.remitente === rol ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              m.remitente === rol 
              ? 'bg-cyan-600 text-white rounded-tr-none' 
              : 'bg-slate-700 text-gray-200 rounded-tl-none'
            }`}>
              {m.texto}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input de envío */}
      <form onSubmit={enviarMensaje} className="p-2 bg-slate-900 flex gap-2">
        <input 
          type="text"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-slate-800 border-none rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none text-white"
        />
        <button type="submit" className="bg-cyan-500 text-slate-900 p-2 rounded-xl font-bold hover:bg-cyan-400 transition-colors">
          ➔
        </button>
      </form>
    </div>
  );
};

export default ChatViaje;