// Versión Arquitectura: V21.37 - Búsqueda Flexible BSON/Firebase UID/NIT para Identificadores de Cooperativa
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\cooperativas\cooperativa.controller.js
 * Misión: Administrar entidades de cooperativas, asignaciones de flota, estados operativos
 * e inyección de suspensión en cascada sobre los conductores vinculados mediante sesión ACID y espejo Firebase.
 * Ajuste V21.37: Incorporación de resolvedor de consulta flexible BSON/Firebase UID/NIT/idCooperativa para búsquedas dinámicas de cooperativa en consultas, recargas y asignaciones.
 */

import mongoose from 'mongoose';
import Cooperativa from '../../models/Cooperativa.js';
import Conductor from '../../models/Conductor.js';
import { dbFirestore, FIRESTORE_PATHS } from '../../config/firebase.js';

// ESTADOS PERMITIDOS EN LA ENTIDAD
const ESTADOS_PERMITIDOS = ['activa', 'inactiva', 'suspendida'];

/**
 * 🛠️ Helper para construir consulta flexible por ID, MongoDB ObjectId, Firebase UID, NIT o identificador personalizado
 */
const construirQueryBusquedaCooperativa = (id) => {
  if (!id) return null;
  const idLimpio = String(id).trim();
  if (!idLimpio) return null;

  if (mongoose.Types.ObjectId.isValid(idLimpio)) {
    return {
      $or: [
        { _id: idLimpio },
        { uid: idLimpio },
        { firebaseUID: idLimpio },
        { nit: idLimpio },
        { idCooperativa: idLimpio }
      ]
    };
  }

  return {
    $or: [
      { uid: idLimpio },
      { firebaseUID: idLimpio },
      { nit: idLimpio },
      { idCooperativa: idLimpio }
    ]
  };
};

/**
 * 📋 Obtener todas las cooperativas con sus despachadores y conductores poblados
 */
export const obtenerCooperativas = async (req, res, next) => {
  try {
    const cooperativas = await Cooperativa.find()
      .populate('despachadores', 'nombre email telefonoMovil rol')
      .populate('conductoresAsignados', 'nombre nombres apellidos placa telefonoMovil estado saldo')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      contador: cooperativas ? cooperativas.length : 0,
      data: cooperativas || []
    });
  } catch (error) {
    console.error('🚨 [CIMCO-COOPERATIVAS-ERR]:', error);
    next(error);
  }
};

/**
 * 🔍 Obtener cooperativa por ID (Soporta MongoDB ObjectId, Firebase UID, NIT)
 */
export const obtenerCooperativaPorId = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const query = construirQueryBusquedaCooperativa(id);

    if (!query) {
      return res.status(400).json({ success: false, error: 'Identificador de cooperativa no proporcionado o inválido.' });
    }

    const cooperativa = await Cooperativa.findOne(query)
      .populate('despachadores', 'nombre email telefonoMovil rol')
      .populate('conductoresAsignados', 'nombre nombres apellidos placa telefonoMovil estado saldo')
      .lean();

    if (!cooperativa) {
      return res.status(404).json({ success: false, error: 'Cooperativa no encontrada en la central.' });
    }

    return res.status(200).json({
      success: true,
      data: cooperativa
    });
  } catch (error) {
    console.error('🚨 [CIMCO-OBTENER-COOPERATIVA-ERR]:', error);
    next(error);
  }
};

/**
 * ➕ Registrar nueva cooperativa
 */
export const crearCooperativa = async (req, res, next) => {
  try {
    const { nombre, nit, telefono, ciudad, limiteFlota, limiteVehiculos } = req.body || {};

    if (!nombre || !nit) {
      return res.status(400).json({
        success: false,
        error: 'El nombre y el NIT son campos requeridos.'
      });
    }

    const nitLimpio = String(nit).trim();
    const existeNIT = await Cooperativa.findOne({ nit: nitLimpio });
    if (existeNIT) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una cooperativa registrada con este NIT.'
      });
    }

    const nuevaCooperativa = new Cooperativa({
      nombre: String(nombre).trim(),
      nit: nitLimpio,
      telefono: telefono ? String(telefono).trim() : '',
      ciudad: ciudad ? String(ciudad).trim() : 'La Jagua de Ibirico',
      limiteFlota: Number(limiteFlota || limiteVehiculos) || 50,
      estado: 'activa'
    });

    await nuevaCooperativa.save();

    console.log(`✅ [CIMCO-COOPERATIVAS] Nueva Entidad Creada: ${nuevaCooperativa.nombre} | NIT: ${nuevaCooperativa.nit}`);

    return res.status(201).json({
      success: true,
      message: 'Cooperativa registrada exitosamente.',
      data: nuevaCooperativa
    });
  } catch (error) {
    console.error('🚨 [CIMCO-CREAR-COOPERATIVA-ERR]:', error);
    next(error);
  }
};

/**
 * 🔄 Cambiar estado (activa, inactiva, suspendida) con Propagación en Cascada sobre Conductores
 */
export const cambiarEstadoCooperativa = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params || {};
    const { estado } = req.body || {};

    const query = construirQueryBusquedaCooperativa(id);

    if (!query) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: 'Identificador de cooperativa no proporcionado o inválido.' });
    }

    const estadoNormalizado = String(estado || '').toLowerCase().trim();
    if (!ESTADOS_PERMITIDOS.includes(estadoNormalizado)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ 
        success: false, 
        error: `Estado no válido. Los estados permitidos son: ${ESTADOS_PERMITIDOS.join(', ')}` 
      });
    }

    const coop = await Cooperativa.findOneAndUpdate(
      query,
      { estado: estadoNormalizado },
      { new: true, session }
    );

    if (!coop) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: 'Cooperativa no encontrada en la central.' });
    }

    let conductoresAfectadosCount = 0;

    // 🔴 ACCIÓN EN CASCADA: Si la cooperativa deja de estar 'activa', se deshabilita la flota vinculada
    if (estadoNormalizado === 'inactiva' || estadoNormalizado === 'suspendida') {
      const queryConductores = {
        $or: [
          { cooperativa: coop.nombre },
          { empresa: coop.nombre },
          { cooperativaId: coop._id },
          { cooperativaId: String(coop._id) }
        ]
      };

      if (coop.uid) {
        queryConductores.$or.push({ cooperativaId: coop.uid });
      }

      if (coop.conductoresAsignados && Array.isArray(coop.conductoresAsignados) && coop.conductoresAsignados.length > 0) {
        queryConductores.$or.push({ _id: { $in: coop.conductoresAsignados } });
      }

      // Obtener IDs de conductores que sufren la desactivación
      const conductoresAfectados = await Conductor.find(queryConductores).select('_id').session(session).lean();
      const idsConductores = conductoresAfectados.map(c => String(c._id));
      conductoresAfectadosCount = idsConductores.length;

      if (idsConductores.length > 0) {
        const payloadDesactivacion = {
          estadoOperativo: 'NO_DISPONIBLE',
          isOnline: false,
          isActive: false,
          estadoAdministrativo: estadoNormalizado === 'suspendida' ? 'SUSPENDIDO' : 'INACTIVO'
        };

        // Update atómico en MongoDB
        await Conductor.updateMany(
          { _id: { $in: idsConductores } },
          { $set: payloadDesactivacion },
          { session }
        );

        // Replicación en tiempo real hacia Firestore dividida en lotes <= 500 operaciones
        if (dbFirestore) {
          try {
            const coleccionConductores = FIRESTORE_PATHS?.conductores || 'conductores';
            const CHUNK_SIZE = 450; // Límite estricto de seguridad por debajo de 500

            for (let i = 0; i < idsConductores.length; i += CHUNK_SIZE) {
              const chunk = idsConductores.slice(i, i + CHUNK_SIZE);
              const batch = dbFirestore.batch();

              for (const condId of chunk) {
                const docRef = dbFirestore.collection(coleccionConductores).doc(condId);
                batch.set(docRef, {
                  isOnline: false,
                  estadoOperativo: 'NO_DISPONIBLE',
                  isActive: false,
                  estadoAdministrativo: payloadDesactivacion.estadoAdministrativo,
                  ultimaActualizacion: new Date().toISOString()
                }, { merge: true });
              }

              await batch.commit();
            }
          } catch (fsError) {
            console.warn(`⚠️ [CIMCO-CASCADE-SYNC-WARN] Falló la actualización de conductores en Firestore: ${fsError.message}`);
          }
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `Estado de la cooperativa actualizado correctamente a '${estadoNormalizado}'. Conductores desactivados en cascada: ${conductoresAfectadosCount}.`,
      data: coop
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('🚨 [CIMCO-ESTADO-COOPERATIVA-ERR]:', error);
    next(error);
  }
};

/**
 * 🛠️ Actualización completa / parcial de datos de la cooperativa
 */
export const actualizarCooperativa = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const query = construirQueryBusquedaCooperativa(id);

    if (!query) {
      return res.status(400).json({ success: false, error: 'Identificador de cooperativa no proporcionado o inválido.' });
    }

    const { nombre, telefono, ciudad, limiteFlota, limiteVehiculos } = req.body || {};
    const updateData = {};

    if (nombre) updateData.nombre = String(nombre).trim();
    if (telefono) updateData.telefono = String(telefono).trim();
    if (ciudad) updateData.ciudad = String(ciudad).trim();
    if (limiteFlota || limiteVehiculos) {
      updateData.limiteFlota = Number(limiteFlota || limiteVehiculos);
    }

    const cooperativaActualizada = await Cooperativa.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );

    if (!cooperativaActualizada) {
      return res.status(404).json({ success: false, error: 'Cooperativa no localizada.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Información de la cooperativa actualizada con éxito.',
      data: cooperativaActualizada
    });
  } catch (error) {
    console.error('🚨 [CIMCO-UPDATE-COOPERATIVA-ERR]:', error);
    next(error);
  }
};

export default {
  obtenerCooperativas,
  obtenerCooperativaPorId,
  crearCooperativa,
  cambiarEstadoCooperativa,
  actualizarCooperativa
};