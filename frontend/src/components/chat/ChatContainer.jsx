// Versión Arquitectura: V1.0 - Chat Real-Time (Path Sagrado)
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const ChatContainer = ({ tripId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef();

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, `artifacts/taxiacimco-app/public/data/chats/${tripId}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [tripId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, `artifacts/taxiacimco-app/public/data/chats/${tripId}/messages`), {
      text: newMessage,
      senderId: user.uid,
      createdAt: serverTimestamp()
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-64 bg-black border-4 border-zinc-800 font-mono">
      <div className="flex-grow overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-2 text-[11px] font-bold uppercase ${
              msg.senderId === user.uid ? 'bg-yellow-400 text-black shadow-[3px_3px_0px_0px_#fff]' : 'bg-zinc-800 text-white shadow-[3px_3px_0px_0px_#facc15]'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={sendMessage} className="p-2 border-t-2 border-zinc-800 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="MENSAJE..."
          className="flex-grow bg-zinc-900 border-2 border-zinc-700 p-2 text-white text-xs outline-none focus:border-yellow-400"
        />
        <button type="submit" className="bg-yellow-400 px-4 text-black font-black uppercase text-[10px]">Enviar</button>
      </form>
    </div>
  );
};

export default ChatContainer;