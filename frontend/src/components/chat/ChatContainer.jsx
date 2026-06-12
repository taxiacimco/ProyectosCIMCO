// Versión Arquitectura: V11.0 - PROD READY: Rutas Limpias Inyectadas y Canal de Mensajería de Alta Velocidad
import React, { useState, useEffect, useRef } from 'react';
import { db, FIRESTORE_PATHS } from '@/config/firebase'; // 🚀 Fusión Atómica: Paths Inyectados
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Send } from 'lucide-react';

const ChatContainer = ({ tripId }) => {
  // 🛡️ Guarda de Seguridad Anti-Undefined
  if (!tripId) {
    console.error("❌ [ChatContainer] Error Crítico: 'tripId' no está definido.");
    return (
      <div className="p-4 text-xs font-mono text-rose-400 bg-[#121214]/80 backdrop-blur-md rounded-xl border border-rose-500/20 text-center">
        Falta el identificador del viaje para inicializar el canal.
      </div>
    );
  }

  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    if (!user?.uid) return;
    
    // 🚀 Ruta Limpia de Producción: chats/{tripId}/messages
    const q = query(
      collection(db, `${FIRESTORE_PATHS.chats}/${tripId}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, (error) => {
      console.error("❌ [ChatContainer] Error en canal de mensajería:", error);
    });

    return () => unsubscribe();
  }, [tripId, user?.uid]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.uid) return;
    try {
      // 🚀 Ruta Limpia de Producción al enviar
      await addDoc(collection(db, `${FIRESTORE_PATHS.chats}/${tripId}/messages`), {
        text: newMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error("❌ [ChatContainer] Error al enviar mensaje:", error);
    }
  };

  return (
    <div className="flex flex-col h-64 bg-[#121214]/80 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Canal de Soporte / Viaje</span>
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-none">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs transition-all ${
                isMe 
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-tr-none' 
                  : 'bg-white/5 text-zinc-100 border border-white/5 rounded-tl-none'
              }`}>
                <p className="leading-relaxed break-words">{msg.text}</p>
                {msg.createdAt && (
                  <span className="block text-[8px] text-right mt-1 opacity-40 font-mono">
                    {new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
          placeholder="Escribe un mensaje..."
          className="flex-grow bg-[#121214]/60 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-amber-500/50 focus:bg-[#121214]/90 transition-all placeholder:text-zinc-500"
        />
        <button 
          type="submit" 
          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default ChatContainer;