import React from 'react';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const BotonExportarExcel = () => {
  const exportarDatos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Obtener Gastos
      const gastosRef = collection(db, "users", user.uid, "gastos");
      const qGastos = query(gastosRef, orderBy("fecha", "desc"));
      const snapshotGastos = await getDocs(qGastos);
      
      const datosGastos = snapshotGastos.docs.map(doc => ({
        Fecha: doc.data().fecha?.toDate().toLocaleDateString() || 'Sin fecha',
        Categoría: doc.data().tipo,
        Monto: doc.data().monto,
        Nota: doc.data().nota || '-',
        Tipo: 'GASTO'
      }));

      // 2. Obtener Ingresos (Viajes)
      const viajesRef = collection(db, "viajes_solicitados");
      const qViajes = query(viajesRef, orderBy("timestamp", "desc"));
      const snapshotViajes = await getDocs(qViajes);
      
      const datosIngresos = snapshotViajes.docs
        .filter(doc => doc.data().conductorId === user.uid && doc.data().estado === 'finalizado')
        .map(doc => ({
          Fecha: doc.data().timestamp?.toDate().toLocaleDateString() || 'Sin fecha',
          Categoría: 'Viaje Realizado',
          Monto: doc.data().costo || 0,
          Nota: `Servicio: ${doc.data().servicioSolicitado}`,
          Tipo: 'INGRESO'
        }));

      // 3. Unir todo y generar Excel
      const libro = XLSX.utils.book_new();
      const todosLosDatos = [...datosIngresos, ...datosGastos];
      
      const hoja = XLSX.utils.json_to_sheet(todosLosDatos);
      XLSX.utils.book_append_sheet(libro, hoja, "Reporte Mensual");

      // 4. Descargar archivo
      XLSX.writeFile(libro, `Reporte_TAXIA_${new Date().getMonth() + 1}.xlsx`);
      
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("No se pudo generar el reporte");
    }
  };

  return (
    <button 
      onClick={exportarDatos}
      className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-2 rounded-xl transition-all flex items-center justify-center gap-2"
    >
      📊 DESCARGAR REPORTE EXCEL (MES)
    </button>
  );
};

export default BotonExportarExcel;