/**
 * frontend/src/api/viajeService.js
 * Servicio para gestionar la lógica de viajes y ganancias.
 * Utiliza la instancia 'api' configurada con interceptores de Firebase.
 */
import api from "./axiosConfig";

/**
 * ✅ Obtiene el reporte de ganancias del conductor.
 * El token de Firebase se inyecta automáticamente gracias al interceptor de axiosConfig.
 */
export const getReporteGanancias = async () => {
  try {
    // Ya no usamos la URL completa ni el axios básico
    // 'api' ya tiene la baseURL configurada y el token listo
    const response = await api.get("/viajes/reporte-ganancias");
    
    /**
     * Nota: axiosConfig.js ya retorna 'response.data' en su interceptor de respuesta,
     * por lo que aquí recibimos directamente los datos procesados.
     */
    return response; 
  } catch (error) {
    console.error("🚨 [ViajeService] Error al obtener reporte de ganancias:", error);
    // Propagamos el error para que el componente UI pueda manejarlo (ej. mostrar un mensaje)
    throw error;
  }
};

/**
 * ✅ Ejemplo: Obtener viajes activos (puedes añadir más métodos aquí)
 */
export const getViajesActivos = async () => {
  try {
    return await api.get("/viajes/activos");
  } catch (error) {
    console.error("🚨 [ViajeService] Error al obtener viajes activos:", error);
    throw error;
  }
};

export default {
  getReporteGanancias,
  getViajesActivos
};