import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Phone, CreditCard, ArrowLeft, Smartphone, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const PagoNequi = () => {
  const [currentUID, setCurrentUID] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUID(user.uid);
        escucharSaldo(user.uid);
      } else {
        await signInAnonymously(auth);
      }
    });
    return () => unsubAuth();
  }, []);

  const escucharSaldo = (uid) => {
    const docRef = doc(db, "usuarios", uid);
    const unsubSnap = onSnapshot(docRef, (snap) => {
      setLoading(false);
      if (snap.exists()) {
        const data = snap.data();
        const rol = (data.rol || "").toLowerCase();
        const saldoActual = data.saldoPendiente || 0;
        
        const rolesPermitidos = ["mototaxi", "motoparrillero", "motocarga", "interconductor", "despachadorintermunicipal"];
        if (!rolesPermitidos.includes(rol)) {
          setMensaje({ texto: "⚠️ Módulo solo para conductores y despachadores.", tipo: 'error' });
          return;
        }
        setSaldo(saldoActual);
      } else {
        setMensaje({ texto: "❌ No se encontraron datos del usuario.", tipo: 'error' });
      }
    });
    return () => unsubSnap();
  };

  const handlePago = async (e) => {
    e.preventDefault();
    if (!saldo || saldo <= 0) return;

    setProcesando(true);
    setMensaje({ texto: "Conectando con pasarela Nequi...", tipo: 'info' });

    try {
      // LLAMADA REAL AL BACKEND JAVA (PUERTO 8081)
      const response = await fetch('http://localhost:8081/api/usuarios/pagar-comision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: currentUID,
          monto: saldo,
          telefonoNequi: telefono
        })
      });

      const data = await response.json();

      if (data.success) {
        setMensaje({ 
          texto: `✅ Pago de $${saldo.toLocaleString()} procesado correctamente.`, 
          tipo: 'success' 
        });
        // IMPORTANTE: No reseteamos el saldo aquí manualmente.
        // Como tenemos un 'onSnapshot' arriba, en cuanto Java actualice Firebase,
        // la pantalla se pondrá en $0 automáticamente.
      } else {
        throw new Error(data.message || "Error en la respuesta del servidor");
      }
    } catch (err) {
      setMensaje({ 
        texto: "❌ Error de conexión: " + err.message, 
        tipo: 'error' 
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#1e293b] border border-slate-700 shadow-[0_0_20px_rgba(255,0,126,0.2)]">
        
        <div className="text-center mb-6">
          <div className="inline-block p-4 rounded-2xl bg-[#ff007e]/10 mb-4">
            <Smartphone size={48} className="text-[#ff007e]" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Pago Nequi</h1>
          <p className="text-slate-400 text-xs font-bold uppercase mt-1">Saldar deudas de CIMCO</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-6">
            <Loader2 className="animate-spin text-[#ff007e] mb-2" />
            <p className="text-xs font-bold text-slate-500 uppercase">Sincronizando Perfil...</p>
          </div>
        ) : (
          <>
            <div className="bg-slate-900/50 border border-slate-700 p-5 rounded-2xl mb-6">
              <span className="text-[10px] font-black text-slate-500 uppercase">ID Conductor</span>
              <p className="text-[10px] text-[#ff007e] font-mono truncate mb-3">{currentUID}</p>
              
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-300">Saldo Pendiente:</span>
                <span className="text-3xl font-black text-[#ff007e]">${saldo.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handlePago} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Teléfono Nequi</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-500" size={18} />
                  <input 
                    type="number" 
                    required 
                    placeholder="310 000 0000"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 p-3 pl-10 rounded-xl focus:border-[#ff007e] outline-none transition-all text-sm text-white"
                  />
                </div>
              </div>

              <button 
                disabled={saldo <= 0 || procesando}
                className="w-full py-4 rounded-2xl bg-[#ff007e] hover:bg-[#e6006e] disabled:opacity-30 disabled:grayscale font-black uppercase text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ff007e]/20"
              >
                {procesando ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                {procesando ? 'Procesando...' : `Pagar $${saldo.toLocaleString()}`}
              </button>
            </form>
          </>
        )}

        {mensaje.texto && (
          <p className={`mt-6 text-center text-[10px] font-black uppercase px-4 py-2 rounded-lg ${
            mensaje.tipo === 'error' ? 'bg-red-500/10 text-red-500' : 
            mensaje.tipo === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-400'
          }`}>
            {mensaje.texto}
          </p>
        )}

        <div className="mt-8 text-center">
          <Link to="/panel" className="text-slate-500 hover:text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
            <ArrowLeft size={14} /> Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PagoNequi;