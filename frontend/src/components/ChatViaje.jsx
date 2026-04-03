import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { MessageCircle, Send, Navigation, CheckCircle2, Clock } from 'lucide-react';

// --- CONFIGURACIÓN DE ENTORNO ---
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = 'taxiacimco-app';

const ChatViaje = ({ viajeId, rol }) => {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const scrollRef = useRef();
  
  // Referencia para audio de notificación
  const audioRef = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'));

  const respuestasRapidas = [
    { texto: "¡Voy en camino! 🏍️", color: "bg-blue-600" },
    { texto: "Ya estoy afuera. 📍", color: "bg-emerald-600" },
    { texto: "Deme 2 minutos. ⏳", color: "bg-purple-600" },
    { texto: "Voy de camisa roja. 👕", color: "bg-rose-600" }
  ];

  useEffect(() => {
    if (!viajeId) return;

    // Ruta específica dentro de nuestro esquema de artifacts
    const chatRef = collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeId, 'chats');
    const q = query(chatRef, orderBy("timestamp", "asc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = [];
      let hayNuevoExterno = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          // Solo sonar si el mensaje NO es mío y NO es carga inicial de caché
          if (data.remitente !== rol && !snapshot.metadata.hasPendingWrites) {
            hayNuevoExterno = true;
          }
        }
      });

      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
      setMensajes(msgs);

      if (hayNuevoExterno) {
        reproducirAlerta();
      }

      // Scroll automático suave
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [viajeId, rol]);

  const reproducirAlerta = () => {
    audioRef.current.play().catch(() => console.log("Permiso de audio requerido"));
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
  };

  const enviarMensaje = async (textoInput) => {
    const contenido = typeof textoInput === 'string' ? textoInput : nuevoMensaje;
    if (!contenido.trim() || !viajeId) return;

    try {
      const chatRef = collection(db, 'artifacts', appId, 'public', 'data', 'viajes_solicitados', viajeId, 'chats');
      await addDoc(chatRef, {
        texto: contenido,
        remitente: rol,
        uid: auth.currentUser?.uid || 'anonimo',
        timestamp: serverTimestamp()
      });
      setNuevoMensaje("");
    } catch (error) {
      console.error("Error chat:", error);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[2rem] border border-white/10 overflow-hidden flex flex-col h-[450px] shadow-2xl">
      {/* HEADER DEL CHAT */}
      <div className="bg-slate-800/50 p-4 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Chat {rol === 'pasajero' ? 'con Conductor' : 'con Pasajero'}
          </span>
        </div>
        <MessageCircle size={16} className="text-slate-500" />
      </div>
      
      {/* CUERPO DE MENSAJES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
        {mensajes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <MessageCircle size={40} />
            <p className="text-[10px] font-bold mt-2">SIN MENSAJES AÚN</p>
          </div>
        )}
        
        {mensajes.map((m) => (
          <div key={m.id} className={`flex ${m.remitente === rol ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
              m.remitente === rol 
              ? 'bg-emerald-600 text-white rounded-tr-none' 
              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
            }`}>
              <p className="leading-relaxed font-medium">{m.texto}</p>
              <div className="flex items-center justify-end gap-1 mt-1 opacity-50">
                <span className="text-[8px] uppercase font-bold">
                  {m.timestamp ? new Date(m.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                </span>
                {m.remitente === rol && <CheckCircle2 size={8} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* RESPUESTAS RÁPIDAS (SCROLL HORIZONTAL) */}
      <div className="p-2 flex gap-2 overflow-x-auto bg-slate-900 border-t border-white/5 no-scrollbar">
        {respuestasRapidas.map((btn, idx) => (
          <button
            key={idx}
            onClick={() => enviarMensaje(btn.texto)}
            className={`${btn.color} whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black text-white shadow-lg active:scale-95 transition-all`}
          >
            {btn.texto}
          </button>
        ))}
      </div>

      {/* INPUT FINAL */}
      <form 
        onSubmit={(e) => { e.preventDefault(); enviarMensaje(); }} 
        className="p-4 bg-slate-900 flex gap-2"
      >
        <input 
          type="text"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-white transition-all"
        />
        <button 
          type="submit" 
          className="bg-emerald-500 text-slate-950 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20 hover:bg-emerald-400 active:scale-90 transition-all"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatViaje; 