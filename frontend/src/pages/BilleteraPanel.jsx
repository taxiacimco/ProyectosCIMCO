import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase/firebaseConfig';
import { doc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Wallet, QrCode, UploadCloud, History, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

const BilleteraPanel = () => {
  const [userData, setUserData] = useState(null);
  const [monto, setMonto] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        setUserData(snap.data());
      });
      return () => unsub();
    }
  }, []);

  const copiarNumero = (num) => {
    navigator.clipboard.writeText(num);
    alert("Número copiado para transferir");
  };

  const handleUploadRecarga = async (e) => {
    e.preventDefault();
    if (!file || !monto) return alert("Por favor completa los datos y sube el comprobante.");

    setLoading(true);
    try {
      const user = auth.currentUser;
      // 1. Subir imagen del comprobante a Firebase Storage
      const storageRef = ref(storage, `comprobantes_recarga/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // 2. Crear solicitud de recarga para el Admin (CIMCO CEO)
      await addDoc(collection(db, "solicitudes_recarga"), {
        uid: user.uid,
        email: user.email,
        nombre: userData?.displayName || "Conductor",
        monto: Number(monto),
        comprobanteUrl: url,
        estado: "pendiente",
        fechaSolicitud: serverTimestamp(),
        metodo: "Nequi/Bancolombia"
      });

      setMensaje({ tipo: 'exito', texto: '¡Comprobante enviado! En breve validaremos tu saldo.' });
      setMonto('');
      setFile(null);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al enviar reporte.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
      {/* HEADER BILLETERA */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-80">Saldo Disponible</p>
          <h2 className="text-5xl font-black mt-2 flex items-center gap-2">
            <span className="text-2xl opacity-50">$</span>{userData?.balance || 0}
          </h2>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
            <CheckCircle2 size={14} className="text-green-400" />
            <span className="text-[10px] font-bold">Cuenta Verificada</span>
          </div>
        </div>
        <Wallet className="absolute -right-4 -bottom-4 text-white/10" size={150} />
      </div>

      {/* SECCIÓN DE TRANSFERENCIA */}
      <div className="grid gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem]">
          <h3 className="text-sm font-black text-cyan-500 uppercase mb-4 flex items-center gap-2">
            <QrCode size={18} /> Cuentas Autorizadas CIMCO
          </h3>
          
          <div className="space-y-3">
            <div className="bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Nequi</p>
                <p className="text-lg font-mono font-bold text-white">300 123 4567</p>
              </div>
              <button onClick={() => copiarNumero('3001234567')} className="p-3 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors">
                <Copy size={18} />
              </button>
            </div>
            
            <div className="bg-slate-950 p-4 rounded-2xl flex justify-between items-center border border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Bancolombia (Ahorros)</p>
                <p className="text-lg font-mono font-bold text-white">123-456789-01</p>
              </div>
              <button onClick={() => copiarNumero('12345678901')} className="p-3 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors">
                <Copy size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* FORMULARIO DE REPORTE */}
        <form onSubmit={handleUploadRecarga} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] space-y-4">
          <h3 className="text-sm font-black text-pink-500 uppercase mb-4 flex items-center gap-2">
            <UploadCloud size={18} /> Reportar Pago
          </h3>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Monto Transferido</label>
            <input 
              type="number" required placeholder="¿Cuánto enviaste?"
              value={monto} onChange={(e) => setMonto(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl outline-none focus:border-pink-500 transition-all font-bold text-xl"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Foto del Comprobante</label>
            <div className="relative">
              <input 
                type="file" required accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden" id="file-upload"
              />
              <label htmlFor="file-upload" className="w-full bg-slate-950 border-2 border-dashed border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-all">
                <UploadCloud className="text-slate-600 mb-2" />
                <span className="text-xs text-slate-400">{file ? file.name : "Seleccionar Imagen"}</span>
              </label>
            </div>
          </div>

          {mensaje && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${mensaje.tipo === 'exito' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              <AlertCircle size={16} /> {mensaje.texto}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black py-4 rounded-xl shadow-lg shadow-pink-900/20 transition-all active:scale-95"
          >
            {loading ? "ENVIANDO REPORTE..." : "SOLICITAR CARGA DE SALDO"}
          </button>
        </form>
      </div>

      {/* HISTORIAL RÁPIDO */}
      <div className="mt-6 px-2">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <History size={14} /> Recargas Recientes
        </h4>
        <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800 text-center">
            <p className="text-[10px] text-slate-600 italic">Tus reportes aparecerán aquí una vez enviados.</p>
        </div>
      </div>
    </div>
  );
};

export default BilleteraPanel;