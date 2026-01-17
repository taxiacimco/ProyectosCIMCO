// functions/src/models/driver.model.js

/**
 * =================================================================
 * MODELO DE DATOS DEL CONDUCTOR (Driver Model)
 * =================================================================
 * Define la estructura de datos que se almacenará en Firestore
 * para cada conductor.
 */

// -----------------------------------------------------------------
// 1. ESTADOS Y CONSTANTES
// -----------------------------------------------------------------

/**
 * Estados de disponibilidad del conductor.
 * Utilizados para el monitoreo en tiempo real y la asignación de viajes.
 */
const DriverStatus = {
    ONLINE: 'online',       // Disponible y esperando viajes
    OFFLINE: 'offline',     // Desconectado
    ON_RIDE: 'on_ride',     // Actualmente en un viaje
    UNAVAILABLE: 'unavailable', // Disponible, pero no puede tomar viajes (ej. descanso)
    PENDING_APPROVAL: 'pending_approval', // Cuenta creada, esperando la aprobación del ADMIN/CEO
    BLOCKED: 'blocked',     // Bloqueado o suspendido
};

/**
 * Tipos de vehículo (usados en la subcolección 'vehicles' y relacionados con AppRole).
 */
const VehicleType = {
    MOTOTAXI: 'mototaxi',
    MOTOPARRILLERO: 'motoparrillero',
    MOTOCARGA: 'motocarga',
    INTERCONDUCTOR: 'interconductor',
    // Si hay vehículos de 4 ruedas, se añadirían aquí (e.g., TAXI_URBANO: 'taxi_urbano')
};

// -----------------------------------------------------------------
// 2. ESTRUCTURA PRINCIPAL (Interface/Schema)
// -----------------------------------------------------------------

/**
 * Define la estructura de datos del documento principal del conductor.
 * NOTA: La autenticación básica (UID, email) se maneja en Firebase Auth,
 * pero esta información es el perfil extendido.
 */
const DriverSchema = {
    // ID del usuario de Firebase Auth (UID)
    uid: 'string', 

    // Información Personal y Documentación
    firstName: 'string',
    lastName: 'string',
    phone: 'string',
    nationalId: 'string', // Documento de identidad
    dateOfBirth: 'Timestamp',
    
    // Información Operativa
    status: DriverStatus.ONLINE, // Estado actual, utiliza los valores de DriverStatus
    currentRideId: 'string | null', // ID del viaje actual, si status es ON_RIDE
    cooperativeId: 'string | null', // ID de la cooperativa a la que pertenece
    
    // Ubicación en Tiempo Real (Geopoint)
    // Se recomienda almacenar esto en una subcolección o en Firebase Realtime Database
    // para alto tráfico de actualizaciones, pero se incluye aquí para referencia:
    lastLocation: {
        latitude: 'number',
        longitude: 'number',
        timestamp: 'Timestamp',
    },
    
    // Métricas y Saldo (Opcional, puede estar en una subcolección/otro servicio)
    rating: 'number', // Puntuación promedio (ej. 4.5)
    totalRides: 'number',
    walletBalance: 'number', // Saldo actual de créditos/ganancias
    
    // Metadata
    isApproved: 'boolean', // Aprobado por un ADMIN/CEO para operar
    isActive: 'boolean', // Estado de la cuenta (no confundir con 'status' de disponibilidad)
    createdAt: 'Timestamp',
    updatedAt: 'Timestamp',
    
    // Referencia al rol (redundante con Custom Claims, pero útil para consultas)
    role: VehicleType.MOTOTAXI, // Debería coincidir con el AppRole de este conductor
};


// -----------------------------------------------------------------
// 3. ESTRUCTURA DEL VEHÍCULO (Usado típicamente en una subcolección: drivers/{uid}/vehicles/{vehicleId})
// -----------------------------------------------------------------

const VehicleSchema = {
    plateNumber: 'string', // Número de matrícula/placa (clave principal del vehículo)
    vehicleType: VehicleType.MOTOTAXI, // Tipo de vehículo
    make: 'string', // Marca
    model: 'string', // Modelo
    year: 'number',
    color: 'string',
    
    // Documentación del vehículo
    soatExpiration: 'Timestamp', // Fecha de vencimiento del SOAT
    technicalInspectionExpiration: 'Timestamp', // Revisión técnico-mecánica
    
    // Estado
    isPrimary: 'boolean', // Si es el vehículo activo que está usando el conductor
    isVerified: 'boolean', // Verificado por la administración
    cooperativeId: 'string', // Asociación al vehículo
    createdAt: 'Timestamp',
};


module.exports = {
    DriverSchema,
    DriverStatus,
    VehicleType,
    VehicleSchema,
};