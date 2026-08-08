// Versión Arquitectura: V16.2 - Migración y Vinculación Centralizada Socket.IO (useSocket V16.2) y Persistencia Dual
import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { Send, Loader2 } from 'lucide-react';

// 🛡️ Helper Polimórfico de Resiliencia Temporal para prevenir TypeError: .toDate is not a function
const formatFechaSegura = (fechaRaw) => {
  if (!fechaRaw) return '';

  try {
    let fechaObj = null;

    // 1. Instancia de Timestamp de Firestore (.toDate)
    if (typeof fechaRaw.toDate === 'function') {
      fechaObj = fechaRaw.toDate();
    }
    // 2. Instancia Nativa de JavaScript Date
    else if (fechaRaw instanceof Date) {
      fechaObj = fechaRaw;
    }
    // 3. Cadena ISO, timestamp numérico o string parseable
    else if (typeof fechaRaw === 'string' || typeof fechaRaw === 'number') {
      fechaObj = new Date(fechaRaw);
    }
    // 4. Objeto plano estructurado { seconds, nanoseconds }
    else if (typeof fechaRaw === 'object' && typeof fechaRaw.seconds === 'number') {
      fechaObj = new Date(fechaRaw.seconds * 1000);
    }

    if (fechaObj && !isNaN(fechaObj.getTime())) {
      return fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.warn('⚠️ [ChatContainer] Error al formatear fecha de mensaje:', error);
  }

  return '';
};

const ChatContainer = ({ tripId }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false); // 🛡️ Control de Concurrencia Móvil
  const scrollRef = useRef();

  // 🚀 Acciones 1 y 2: Suscripción a salas y eventos de chat bidireccional mediante instancia unificada `useSocket`
  useEffect(() => {
    if (!socket || !tripId) return;

    // Conectarse a la sala específica del viaje
    if (isConnected) {
      socket.emit('join_room', { room: tripId, user: user?.uid });
    }

    // Oyente para recepcionar mensajes en tiempo real vía Socket.io
    const handleReceiveMessage = (incomingMsg) => {
      if (!incomingMsg) return;
      
      setMessages((prevMessages) => {
        // Blindaje Anti-Duplicados: Comprobar presencia por id o contenido exacto + timestamp
        const existe = prevMessages.some(m => 
          (m.id && incomingMsg.id && m.id === incomingMsg.id) ||
          (m.text === incomingMsg.text && m.senderId === incomingMsg.senderId && Math.abs(new Date(m.createdAt) - new Date(incomingMsg.createdAt)) < 1000)
        );
        if (existe) return prevMessages;
        return [...prevMessages, incomingMsg];
      });
    };

    socket.on('receive_message', handleReceiveMessage);

    // 🚀 Acción 3: Limpieza Segura - Desregistrar únicamente el oyente específico sin desconectar el transporte de red
    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, isConnected, tripId, user?.uid]);

  // 🚀 Sincronización del Canal de Mensajería con Compensación de Latencia (Firestore Reactive Sync)
  useEffect(() => {
    if (!user?.uid || !tripId) return;
    
    const q = query(
      collection(db, `${FIRESTORE_PATHS.chats}/${tripId}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // ⚡ Inyección de 'estimate' para mitigar el nulo transitorio del serverTimestamp local
      const mensajesProcesados = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data({ serverTimestamps: 'estimate' }) 
      }));
      
      setMessages(mensajesProcesados);
    }, (error) => {
      console.error("❌ [ChatContainer] Error en canal de mensajería:", error);
    });

    return () => unsubscribe();
  }, [tripId, user?.uid]);

  // 📜 Gestión del scroll adaptativo al recibir flujos de datos
  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 🛡️ Guarda de Seguridad Táctica (Reubicada post-Hooks para respetar las Reglas de React)
  if (!tripId) {
    console.error("❌ [ChatContainer] Error Crítico: 'tripId' no está definido.");
    return (
      <div className="p-4 text-xs font-mono text-rose-400 bg-[#121214]/80 backdrop-blur-md rounded-xl border border-rose-500/20 text-center">
        Falta el identificador del viaje para inicializar el canal.
      </div>
    );
  }

  const sendMessage = async (e) => {
    e.preventDefault();
    const textoLimpio = newMessage.trim();
    if (!textoLimpio || !user?.uid || isSending) return;

    try {
      setIsSending(true); // Bloqueo preventivo en redes de baja cobertura
      
      const payloadMensaje = {
        tripId,
        room: tripId,
        text: textoLimpio,
        senderId: user.uid,
        createdAt: new Date().toISOString()
      };

      // 1. Emisión bidireccional vía Socket.IO unificado
      if (socket && isConnected) {
        socket.emit('send_message', payloadMensaje);
      }

      // 2. Persistencia duradera en Firestore
      await addDoc(collection(db, `${FIRESTORE_PATHS.chats}/${tripId}/messages`), {
        text: textoLimpio,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      
      setNewMessage("");
    } catch (error) {
      console.error("❌ [ChatContainer] Error al enviar mensaje:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-64 bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Canal de Soporte / Viaje</span>
        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-none">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          const horaFormatted = formatFechaSegura(msg.createdAt);

          return (
            <div key={msg.id || `${msg.senderId}-${msg.createdAt}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs transition-all ${
                isMe 
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-tr-none' 
                  : 'bg-white/5 text-zinc-100 border border-white/5 rounded-tl-none'
              }`}>
                <p className="leading-relaxed break-words">{msg.text}</p>
                {horaFormatted && (
                  <span className="block text-[8px] text-right mt-1 opacity-40 font-mono">
                    {horaFormatted}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 bg-white/5 border-t border-white/5 flex gap-2 items-center">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isSending ? "Enviando..." : "Escribe un mensaje..."}
          disabled={isSending}
          className="flex-grow bg-[#121214]/60 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500/50 focus:bg-[#121214]/90 transition-all placeholder:text-zinc-500 disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={isSending || !newMessage.trim()}
          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
};

export default ChatContainer;