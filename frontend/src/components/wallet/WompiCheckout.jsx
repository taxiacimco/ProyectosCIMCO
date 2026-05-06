// Versión Arquitectura: V5.0 - Integración de Smart Gateway y Trazabilidad de Usuario
/**
 * ARCHIVO: WompiCheckout.jsx
 * PROYECTO: TAXIA CIMCO
 * MISIÓN: Interfaz de pago segura con Wompi. Gestiona el ciclo de vida del widget 
 * y asegura que el targetUid se envíe al backend para la conciliación de saldos.
 */

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react'; 
import { getAuth } from 'firebase/auth'; 
import api from '../../api/axiosConfig'; 

const WompiCheckout = ({ amount = 10000, reference, userType = 'CONDUCTOR' }) => {
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  useEffect(() => {
    // 🛡️ Inyección de script de pasarela oficial
    const script = document.createElement('script');
    script.src = "https://checkout.wompi.co/widget.js"; 
    script.async = true;
    
    script.onload = () => console.log("✅ [CIMCO] Pasarela Wompi inicializada correctamente.");
    script.onerror = () => console.error("❌ [CIMCO] Error crítico cargando el script de Wompi.");

    document.body.appendChild(script);

    return () => {
      const widgetScript = document.querySelector('script[src="https://checkout.wompi.co/widget.js"]');
      if (widgetScript) document.body.removeChild(widgetScript);
    };
  }, []);

  const handlePayment = async () => {
    if (!userType) {
      alert("⚠️ ALERTA DE ARQUITECTURA: No se ha definido el tipo de usuario (userType).");
      return;
    }

    setLoading(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Sesión no detectada. Debes estar autenticado para transaccionar.");
      
      const finalReference = reference || `TXC-${Date.now()}-${currentUser.uid.slice(0, 5)}`;
      
      // 🛰️ Llamada al Backend: Sincronización con el endpoint de intención de pago
      const response = await api.post('/v1/wallet/payment-intent', {
        amount: amount * 100, // Wompi procesa en centavos
        reference: finalReference,
        user_type: userType,
        targetUid: currentUser.uid // ✅ Trazabilidad garantizada para el balance
      });

      const { signature, publicKey } = response.data.data;

      if (!window.WidgetCheckout) throw new Error("El componente global de Wompi no está disponible.");

      const checkout = new window.WidgetCheckout({
        currency: 'COP',
        amountInCents: amount * 100,
        reference: finalReference,
        publicKey: publicKey,
        signature: signature,
        redirectUrl: window.location.origin + '/billetera'
      });

      checkout.open((result) => {
        if (result.transaction.status === 'APPROVED') {
          console.log("💰 [CIMCO] Transacción aprobada:", result.transaction.id);
        }
      });

    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error("❌ [Wompi Checkout Error]:", errorMsg);
      alert(`Error en el proceso de pago: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.1rem] shadow-xl">
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full py-4 rounded-[2rem] bg-slate-950 text-white font-black uppercase italic tracking-tighter flex items-center justify-center gap-3 hover:bg-slate-900 transition-all disabled:opacity-50 active:scale-95"
      >
        <span className="bg-blue-600 p-1 rounded-lg"><Plus size={18} /></span>
        {loading ? 'Verificando Protocolos...' : 'Recargar Billetera'}
      </button>
    </div>
  );
};

export default WompiCheckout;