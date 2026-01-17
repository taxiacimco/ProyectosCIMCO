import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onFinished }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // La pantalla se muestra por 2.5 segundos
    const timer = setTimeout(() => setFadeOut(true), 2500);
    const finishTimer = setTimeout(() => onFinished(), 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinished]);

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative">
        {/* Logo con efecto de pulso profesional */}
        <img 
          src="/img/logo-taxiacimco.png" 
          alt="TAXIA Logo" 
          className="w-48 h-auto animate-pulse"
        />
        {/* Spinner de carga minimalista */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-6 h-6 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      </div>
      
      <div className="absolute bottom-10 text-center">
        <p className="text-cyan-500 font-black tracking-[0.2em] text-xs">VAN EXPRESS</p>
        <p className="text-gray-600 text-[10px] mt-1 uppercase font-bold">La Jagua de Ibirico</p>
      </div>
    </div>
  );
};

export default SplashScreen;