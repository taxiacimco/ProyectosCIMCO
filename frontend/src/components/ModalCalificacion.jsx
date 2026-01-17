import React, { useState } from 'react';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, increment } from 'firebase/firestore';

const ModalCalificacion = ({ viajeId, usuarioACalificarId, rolQueCalifica, onFinish }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const enviarCalificacion = async () => {
    if (rating === 0) return alert("Por favor selecciona una estrella");

    try {
      const viajeRef = doc(db, "viajes_solicitados", viajeId);
      const usuarioRef = doc(db, "users", usuarioACalificarId);

      // 1. Guardar calificación en el viaje
      const campoCalificacion = rolQueCalifica === 'pasajero' ? 'califAlConductor' : 'califAlPasajero';
      await updateDoc(viajeRef, { [campoCalificacion]: rating });

      // 2. Actualizar reputación del usuario calificado
      await updateDoc(usuarioRef, {
        ratingTotal: increment(rating),
        viajesCalificados: increment(1)
      });

      alert("¡Gracias por calificar!");
      onFinish();
    } catch (error) {
      console.error("Error calificado:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <h2 className="text-xl font-black text-white mb-2">
          {rolQueCalifica === 'pasajero' ? '¿Cómo estuvo tu viaje?' : '¿Cómo fue el pasajero?'}
        </h2>
        <p className="text-gray-400 text-sm mb-6">Tu opinión ayuda a la comunidad de La Jagua.</p>
        
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className={`text-4xl transition-transform active:scale-90 ${star <= (hover || rating) ? 'text-yellow-400' : 'text-slate-700'}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </button>
          ))}
        </div>

        <button 
          onClick={enviarCalificacion}
          className="w-full bg-cyan-500 text-slate-950 font-black py-4 rounded-2xl hover:bg-cyan-400 transition-colors"
        >
          ENVIAR CALIFICACIÓN
        </button>
      </div>
    </div>
  );
};

export default ModalCalificacion;