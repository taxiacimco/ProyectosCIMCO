import React from 'react';

const TicketViaje = ({ viaje, conductorInfo }) => {
  if (!viaje) return null;

  // Lógica para calcular el promedio de estrellas
  const calcularEstrellas = () => {
    if (!conductorInfo?.ratingTotal || !conductorInfo?.viajesCalificados) return "Nuevo";
    const promedio = (conductorInfo.ratingTotal / conductorInfo.viajesCalificados).toFixed(1);
    return `${promedio} ⭐`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-500">
        
        {/* Encabezado */}
        <div className="bg-cyan-600 p-6 text-white text-center">
          <div className="text-4xl mb-2">
            {viaje.servicioSolicitado?.includes('Moto') ? '🛵' : '🚐'}
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Vehículo Asignado</h2>
          <p className="text-cyan-100 text-xs">Tu transporte está en camino</p>
        </div>

        {/* Cuerpo del Ticket */}
        <div className="p-6 space-y-6">
          
          {/* Info del Conductor con Estrellas */}
          <div className="flex items-center gap-4 border-b pb-4 border-gray-100">
            <div className="relative">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl border-2 border-cyan-500 overflow-hidden">
                {conductorInfo?.fotoPerfil ? (
                  <img src={conductorInfo.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" />
                ) : "👤"}
              </div>
              {/* Badge de Estrellas flotante */}
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-white">
                {calcularEstrellas()}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Conductor</p>
              <p className="text-lg font-bold text-slate-800">{conductorInfo?.nombre || "Asignado"}</p>
              <p className="text-[10px] text-cyan-600 font-bold uppercase">Verificado por TAXIA</p>
            </div>
          </div>

          {/* Info del Vehículo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Placa</p>
              <p className="text-xl font-black text-cyan-700">{viaje.placaVehiculo || conductorInfo?.placa || "---"}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">N° Interno</p>
              <p className="text-xl font-black text-slate-700">{conductorInfo?.numeroInterno || "---"}</p>
            </div>
          </div>

          {/* Detalles del Servicio */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Servicio:</span>
              <span className="font-bold text-slate-700">{viaje.servicioSolicitado}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                viaje.estado === 'en_ruta' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {viaje.estado === 'en_ruta' ? 'En Camino' : 'Asignado'}
              </span>
            </div>
          </div>
        </div>

        {/* Pie del Ticket con efecto de recorte */}
        <div className="relative h-4 bg-white">
            <div className="absolute -bottom-2 left-0 right-0 flex justify-around overflow-hidden">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-slate-900 rounded-full"></div>
                ))}
            </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center">
            <p className="text-[10px] text-gray-400">Presenta este ticket al abordar el vehículo</p>
        </div>
      </div>
    </div>
  );
};

export default TicketViaje;