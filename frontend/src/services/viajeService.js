// Versión Arquitectura: V2.0 - Integración Motor Financiero (Cobro de Comisión)
/**
 * SERVICIO DE GESTIÓN DE VIAJES - CIMCO (PRO-VERSION)
 * Ubicación: frontend/src/services/viajeService.js
 * Capa de servicio para manejar la lógica de viajes (Firestore Direct & API Java).
 */
import api from "../api/axiosConfig";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const VIAJE_ENDPOINT = "/viajes";
const appId = 'taxiacimco-app';

const viajeService = {
  /**
   * CREACIÓN QUIRÚRGICA EN FIRESTORE (Activa Trigger Backend)
   * @param {Object} datos - { destino, referencia, valor, tipoVehiculo, ubicacionRecogida }
   */
  solicitarViajeFirestore: async (datos) => {
    try {
      console.log(`[CIMCO-FS] Iniciando protocolo de búsqueda...`);
      
      const nuevoViaje = {
        clienteId: auth.currentUser.uid,
        clienteNombre: auth.currentUser.displayName || 'Usuario CIMCO',
        status: "searching", // Estado clave para el Trigger
        tipoVehiculo: datos.tipoVehiculo || "mototaxi",
        tarifa: Number(datos.valor),
        origen: { // Usado por el radar de 5km en el backend
          latitude: datos.ubicacionRecogida.lat,
          longitude: datos.ubicacionRecogida.lng
        },
        puntoRecogidaManual: datos.destino,
        referencia: datos.referencia,
        createdAt: serverTimestamp(),
        plataforma: "web-pwa"
      };

      // Escritura en la RUTA SAGRADA
      const docRef = await addDoc(
        collection(db, "artifacts", appId, "public", "data", "rides"), 
        nuevoViaje
      );

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("❌ Error en persistencia Firestore:", error);
      throw error;
    }
  },

  /**
   * Envía una solicitud al Backend Java (Opcional/Legacy)
   */
  solicitarViaje: async (datosViaje) => {
    try {
      console.log(`[CIMCO-API] Solicitando nuevo viaje a Java...`);
      const response = await api.post(`${VIAJE_ENDPOINT}/solicitar`, datosViaje);
      return response;
    } catch (error) {
      console.error("❌ Error al solicitar viaje en Java:", error);
      throw error;
    }
  },

  /**
   * Aceptación de viaje (Backend Java)
   */
  aceptarViaje: async (viajeId, conductorId) => {
    try {
      console.log(`[CIMCO-API] Intentando aceptar viaje: ${viajeId}`);
      const response = await api.post(`${VIAJE_ENDPOINT}/aceptar`, {
        viajeId,
        conductorId,
        timestamp: new Date().toISOString()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error("❌ Error al aceptar el viaje en el servidor:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Error de conexión con el servidor" 
      };
    }
  },

  /**
   * FINALIZACIÓN Y COBRO DE COMISIÓN (Motor Financiero)
   * Extrae el token de Firebase y ejecuta el débito en la wallet.
   */
  finalizarViajeYCobrar: async (conductorId, tarifaMonto) => {
    try {
      console.log(`[CIMCO-FINANZAS] Procesando cobro de comisión...`);
      
      // 1. Obtenemos el Token JWT fresco para máxima seguridad
      const token = await auth.currentUser.getIdToken(true);

      // 2. Llamada al endpoint quirúrgico (enviamos la tarifa total, el backend calcula el porcentaje)
      const response = await api.post('/v1/wallet/commission', {
        conductorId: conductorId,
        montoBase: Number(tarifaMonto)
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      console.error("❌ Error en el motor financiero:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || "Fondos insuficientes o error de conexión." 
      };
    }
  },

  obtenerHistorial: async (usuarioId) => {
    try {
      return await api.get(`${VIAJE_ENDPOINT}/usuario/${usuarioId}`);
    } catch (error) {
      console.error("❌ Error al obtener historial:", error);
      throw error;
    }
  }
};

export default viajeService;