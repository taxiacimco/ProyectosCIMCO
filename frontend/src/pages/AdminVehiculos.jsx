import React, { useState, useEffect } from 'react';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import api from '../api/axiosConfig';
import { ShieldCheck, Truck, Users, MapPin, Database, PlusCircle, Info } from 'lucide-react';

const AdminVehiculos = () => {
  const [formData, setFormData] = useState({
    placa: '',
    numeroInterno: '',
    conductorEmail: '',
    modelo: '',
    tipoServicio: '', 
    cooperativa: ''   
  });

  const [cooperativas, setCooperativas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recientes, setRecientes] = useState([]); // Para ver los últimos registrados

  // Cargar cooperativas y últimos registros
  useEffect(() => {
    const cargarData = async () => {
      try {
        const coopSnap = await getDocs(collection(db, "cooperativas"));
        setCooperativas(coopSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Opcional: Cargar los últimos 5 vehículos vinculados para feedback visual
        const vehSnap = await getDocs(query(collection(db, "vehiculos"), orderBy("fechaRegistro", "desc"), limit(5)));
        setRecientes(vehSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error inicializando:", error);
      }
    };
    cargarData();
  }, []);

  const registrarVehiculo = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        cooperativa: formData.tipoServicio === 'Vehiculo Intermunicipal' ? formData.cooperativa : 'N/A',
        conductorEmail: formData.conductorEmail.toLowerCase().trim(),
        fechaRegistro: new Date().toISOString()
      };

      // LLAMADA AL BACKEND CENTRALIZADO
      const response = await api.post('/drivers/register-vehicle', payload);

      if (response.success) {
        alert(`🚀 VEHÍCULO VINCULADO: La placa ${formData.placa} ahora pertenece a ${formData.conductorEmail}`);
        setFormData({ placa: '', numeroInterno: '', conductorEmail: '', modelo: '', tipoServicio: '', cooperativa: '' });
      }
    } catch (error) {
      alert(error.error || "Error de vinculación. ¿El conductor ya tiene cuenta de usuario?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8">
      {/* HEADER MASTER */}
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
            CONTROL DE FLOTA CIMCO
          </h1>
          <p className="text-slate-400 font-medium flex items-center gap-2 mt-1">
            <ShieldCheck size={16} className="text-cyan-500" /> 
            Panel Maestro de Vinculación Vehicular (CEO)
          </p>
        </div>
        <div className="flex gap-4">
            <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Estado Backend</p>
                <p className="text-xs font-bold text-green-500 flex items-center gap-1">● Sincronizado</p>
            </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO DE REGISTRO */}
        <div className="lg:col-span-2">
          <form onSubmit={registrarVehiculo} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Database size={120} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* CATEGORÍA CON EMOJIS */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2 ml-1">
                  Categoría de Servicio
                </label>
                <select 
                  required
                  value={formData.tipoServicio}
                  onChange={(e) => setFormData({...formData, tipoServicio: e.target.value})}
                  className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 focus:border-cyan-500 outline-none text-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="">Seleccione el tipo de unidad...</option>
                  <option value="Mototaxi">🛺 Mototaxi (Urbano)</option>
                  <option value="Motoparrillero">🏍️ Motoparrillero</option>
                  <option value="Motocarga">🚚 Motocarga (Pesado)</option>
                  <option value="Vehiculo Intermunicipal">🚐 Intermunicipal (Cooperativa)</option>
                </select>
              </div>

              {/* COOPERATIVA DINÁMICA */}
              {formData.tipoServicio === 'Vehiculo Intermunicipal' && (
                <div className="md:col-span-2 animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2 ml-1">
                    Cooperativa Asignada
                  </label>
                  <select 
                    required
                    value={formData.cooperativa}
                    onChange={(e) => setFormData({...formData, cooperativa: e.target.value})}
                    className="w-full bg-purple-950/10 p-4 rounded-2xl border border-purple-900/40 focus:border-purple-500 outline-none text-sm"
                  >
                    <option value="">¿A qué empresa pertenece?</option>
                    {cooperativas.map((coop) => (
                      <option key={coop.id} value={coop.nombre}>{coop.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* DATOS TÉCNICOS */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Placa (ID Visual)</label>
                <input 
                  type="text" required placeholder="ABC-123"
                  value={formData.placa}
                  onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 focus:border-cyan-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Número Interno</label>
                <input 
                  type="text" required placeholder="Ej: 045"
                  value={formData.numeroInterno}
                  onChange={(e) => setFormData({...formData, numeroInterno: e.target.value})}
                  className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 focus:border-cyan-500 outline-none text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Email del Conductor (Debe estar registrado)</label>
                <input 
                  type="email" required placeholder="conductor@cimco.com"
                  value={formData.conductorEmail}
                  onChange={(e) => setFormData({...formData, conductorEmail: e.target.value.toLowerCase()})}
                  className="w-full bg-slate-950 p-4 rounded-2xl border border-slate-800 focus:border-cyan-500 outline-none text-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${
                loading ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-cyan-600 to-blue-700 hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-95 text-white'
              }`}
            >
              {loading ? (
                <>Sincronizando...</>
              ) : (
                <><PlusCircle size={20} /> Vincular a la Flota Nacional</>
              )}
            </button>
          </form>
        </div>

        {/* COLUMNA DE INFO Y RECIENTES */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-[2rem] border border-slate-800 shadow-xl">
            <h3 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2">
                <Info size={16} className="text-cyan-400" /> Protocolo de Registro
            </h3>
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-[10px] font-bold">1</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">El backend verifica que el <b>Conductor</b> exista en el sistema antes de permitir la vinculación.</p>
                </div>
                <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center text-[10px] font-bold">2</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Para <b>Intermunicipales</b>, se requiere obligatoriamente una Cooperativa para habilitar el despacho.</p>
                </div>
                <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-[10px] font-bold">3</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">Una vez vinculado, el conductor recibirá una notificación y podrá ver su vehículo en su panel.</p>
                </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-800">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Últimas Vinculaciones</h3>
            <div className="space-y-3">
                {recientes.length > 0 ? recientes.map(r => (
                    <div key={r.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/50 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-white">{r.placa}</p>
                            <p className="text-[9px] text-slate-500">{r.tipoServicio}</p>
                        </div>
                        <div className="text-[8px] bg-slate-900 px-2 py-1 rounded text-slate-400 font-mono">
                            ID:{r.numeroInterno}
                        </div>
                    </div>
                )) : (
                    <p className="text-[10px] text-slate-600 italic">Esperando nuevos registros...</p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVehiculos;