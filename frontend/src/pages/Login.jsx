// Versión Arquitectura: V6.6 - Integración de Login con UI Ciber-Neo-Brutalista
/**
 * src/pages/Login.jsx
 * Misión: Proveer la interfaz de entrada a TAXIA CIMCO con extrema legibilidad y diseño Brutalista.
 */
import React, { useState } from 'react';
import { auth } from '../config/firebase'; // ✅ Instancia Singleton conectada
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const Login = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    try {
      // Abre el popup de Google protegido por la infraestructura de Firebase
      await signInWithPopup(auth, provider);
      // Nota: No necesitamos redireccionar aquí porque el AppRouter ya está 
      // escuchando el cambio de estado en onAuthStateChanged y lo hará automáticamente.
    } catch (error) {
      console.error("⚠️ Error de Autenticación:", error.code, error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-mono selection:bg-yellow-400 selection:text-black">
      
      {/* 🛡️ Tarjeta Neo-Brutalista */}
      <div className="w-full max-w-md bg-zinc-900 border-4 border-yellow-400 p-8 relative shadow-[8px_8px_0px_0px_#facc15] transition-all hover:shadow-[12px_12px_0px_0px_#facc15]">
        
        {/* Decoración Ciber-Tech */}
        <div className="absolute -top-3 -left-3 bg-yellow-400 text-black text-xs font-black px-2 py-1 uppercase tracking-widest border-2 border-black">
          SISTEMA_ACTIVO
        </div>

        <div className="flex flex-col items-center text-center mt-4">
          
          {/* Logo */}
          <div className="w-24 h-24 bg-black border-4 border-yellow-400 rounded-none mb-6 flex items-center justify-center overflow-hidden shadow-[4px_4px_0px_0px_#facc15]">
             <img 
              src="/assets/pasajero-192.png" 
              alt="CIMCO Logo" 
              className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
              onError={(e) => {
                // Fallback icon si no existe la imagen en public/assets/
                e.target.src = "https://ui-avatars.com/api/?name=TX&background=000&color=facc15&font-size=0.5&bold=true";
              }}
            />
          </div>

          {/* Textos Principales */}
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">
            TAXIA <span className="text-yellow-400">CIMCO</span>
          </h1>
          <p className="text-zinc-400 text-sm font-bold tracking-widest uppercase mb-10 border-b-2 border-zinc-800 pb-4 w-full">
            Logística & Transporte // La Jagua
          </p>

          {/* Botón de Acción Principal */}
          <button 
            onClick={handleGoogleLogin} 
            disabled={isAuthenticating}
            className={`w-full group relative flex items-center justify-center gap-4 bg-yellow-400 text-black border-4 border-black py-4 px-6 text-lg font-black uppercase tracking-widest transition-all
              ${isAuthenticating 
                ? 'opacity-70 cursor-not-allowed translate-y-1 shadow-none' 
                : 'hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#fff] active:translate-y-1 active:shadow-none'
              }`}
          >
            {isAuthenticating ? (
              <span className="animate-pulse">Verificando...</span>
            ) : (
              <>
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-6 h-6 bg-white rounded-full border-2 border-black p-0.5" 
                />
                Ingresar al Panel
              </>
            )}
          </button>
        </div>

        {/* Footer Técnico */}
        <div className="mt-10 flex justify-between items-center text-[10px] text-zinc-600 font-mono uppercase tracking-widest border-t-2 border-zinc-800 pt-4">
          <span>V 2.0.26</span>
          <span>Red Segura CF-TLS</span>
        </div>

      </div>
    </div>
  );
};

export default Login;