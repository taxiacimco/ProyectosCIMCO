import React, { useState } from 'react';
import { PlusCircle, Truck, AlertCircle } from 'lucide-react';

const AdminVehiculos = () => {
  const [form, setForm] = useState({ placa: '', numeroInterno: '', conductorEmail: '', tipoServicio: '' });
  const [error, setError] = useState("");

  const validatePlaca = (val) => {
    const regex = /^[A-Z]{3}-\d{3}$/;
    setForm({...form, placa: val.toUpperCase()});
    setError(!regex.test(val.toUpperCase()) ? "Formato requerido: AAA-123" : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (error) return;
    try {
      // Aquí conectarías con tu backend Java Spring Boot de CIMCO
      console.log("Registrando vehículo:", form);
      alert("Vehículo registrado exitosamente.");
      setForm({ placa: '', numeroInterno: '', conductorEmail: '', tipoServicio: '' });
    } catch (e) { alert("Error al registrar."); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8 flex justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl space-y-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-4">
          <Truck className="text-blue-500" />
          <h2 className="text-xl font-semibold">Registro de Unidad</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 ml-1 font-medium">PLACA (AAA-123)</label>
            <input 
              value={form.placa} onChange={(e) => validatePlaca(e.target.value)}
              className="w-full bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl text-sm outline-none focus:border-blue-500/50 transition-all"
            />
            {error && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{error}</p>}
          </div>
          <div>
            <label className="text-xs text-zinc-500 ml-1 font-medium">NÚMERO INTERNO</label>
            <input 
              value={form.numeroInterno} onChange={(e) => setForm({...form, numeroInterno: e.target.value})}
              className="w-full bg-zinc-950/50 border border-zinc-800 p-3 rounded-xl text-sm outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <button type="submit" disabled={!!error} className="w-full bg-zinc-100 text-zinc-900 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white transition-all">
          <PlusCircle size={18} /> Vincular Vehículo
        </button>
      </form>
    </div>
  );
};

export default AdminVehiculos;