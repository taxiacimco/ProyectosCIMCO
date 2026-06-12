// Versión Arquitectura: V12.0 - PROD READY: Matriz de Gobernanza Temática y Control de Acceso (ACL)
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\config\constants.js
 * Misión: Centralizar los diccionarios, roles oficiales y niveles de acceso jerárquicos del ecosistema.
 */

// 👥 ROLES PRINCIPALES DEL SISTEMA
export const ROLES = {
    ADMIN: 'ADMIN',               // CEO / Administrador Máximo
    SECRETARIA: 'SECRETARIA',     // Soporte y Operaciones (Staff)
    DESPACHADOR: 'DESPACHADOR',   // Logística Pesada de Terminal
    CONDUCTOR: 'CONDUCTOR',       // Flota Operativa de Vehículos
    PASAJERO: 'PASAJERO'          // Clientes / Usuarios finales
};

// 🏍️ SUB-ROLES / TIPOS DE VEHÍCULOS (Especialización de Conductor)
export const VEHICLE_TYPES = {
    MOTOTAXI: 'mototaxi',
    MOTOPARRILLERO: 'motoparrillero',
    MOTOCARGA: 'motocarga',
    INTERMUNICIPALES: 'intermunicipal'
};

// 🔐 FIREWALL ACL: Niveles de acceso oficiales para validación dura de rutas y vistas
export const DEFAULT_ACCESS_LEVELS = {
    [ROLES.PASAJERO]: 0,          // Punto de partida base
    [ROLES.CONDUCTOR]: 10,        // Acceso a Consola Conductor y Telemetría
    [ROLES.DESPACHADOR]: 30,      // Control de despachos de su flota asignada
    [ROLES.SECRETARIA]: 50,      // Staff operativo: Puede ver el Mapa en Vivo pero no destruir datos
    [ROLES.ADMIN]: 99             // CEO / Control Absoluto de Nodos y Módulo Financiero
};

// 🏛️ COLECCIONES LEGACY MONGODB / FIRESTORE (Preservación por retrocompatibilidad)
export const COLLECTIONS = {
    VIAJES: 'viajes',
    VIAJES_INTERMUNICIPALES: 'viajes_intermunicipales',
    USUARIOS: 'usuarios'
};