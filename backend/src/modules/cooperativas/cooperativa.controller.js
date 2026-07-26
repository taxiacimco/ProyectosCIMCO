// Versión Arquitectura: V16.12 - Gestión de Cooperativas con Exportaciones Homogéneas y Validaciones BSON
/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\cooperativas\cooperativa.controller.js
 * Misión: Administrar entidades de cooperativas, asignaciones de flota y estados operativos.
 */

import mongoose from 'mongoose';
import Cooperativa from '../../models/Cooperativa.js';

// ESTADOS PERMITIDOS EN LA ENTIDAD
const ESTADOS_PERMITIDOS = ['activa', 'inactiva', 'suspendida'];

/**
 * 📋 Obtener todas las cooperativas con sus despachadores y conductores poblados
 */
export const obtenerCooperativas = async (req, res) => {
  try {
    const cooperativas = await Cooperativa.find()
      .populate('despachadores', 'nombre email telefonoMovil rol')
      .populate('conductoresAsignados', 'nombre nombres apellidos placa telefonoMovil estado saldo')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      contador: cooperativas.length,
      data: cooperativas
    });
  } catch (error) {
    console.error('🚨 [CIMCO-COOPERATIVAS-ERR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar la lista de cooperativas.'
    });
  }
};

/**
 * 🔍 Obtener cooperativa por ID
 */
export const obtenerCooperativaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Identificador BSON de cooperativa inválido.' });
    }

    const cooperativa = await Cooperativa.findById(id)
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
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar el detalle de la cooperativa.'
    });
  }
};

/**
 * ➕ Registrar nueva cooperativa
 */
export const crearCooperativa = async (req, res) => {
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
      ciudad: ciudad || 'La Jagua de Ibirico',
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
    return res.status(500).json({
      success: false,
      error: 'Error interno al crear la cooperativa.'
    });
  }
};

/**
 * 🔄 Cambiar estado (activa, inactiva, suspendida)
 */
export const cambiarEstadoCooperativa = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Identificador BSON de cooperativa inválido.' });
    }

    const estadoNormalizado = String(estado).toLowerCase().trim();
    if (!ESTADOS_PERMITIDOS.includes(estadoNormalizado)) {
      return res.status(400).json({ 
        success: false, 
        error: `Estado no válido. Los estados permitidos son: ${ESTADOS_PERMITIDOS.join(', ')}` 
      });
    }

    const coop = await Cooperativa.findByIdAndUpdate(
      id,
      { estado: estadoNormalizado },
      { new: true }
    );

    if (!coop) {
      return res.status(404).json({ success: false, error: 'Cooperativa no encontrada en la central.' });
    }

    return res.status(200).json({
      success: true,
      message: `Estado actualizado correctamente a: ${estadoNormalizado}`,
      data: coop
    });
  } catch (error) {
    console.error('🚨 [CIMCO-ESTADO-COOPERATIVA-ERR]:', error);
    return res.status(500).json({ success: false, error: 'Error al actualizar estado de la cooperativa.' });
  }
};

/**
 * 🛠️ Actualización completa / parcial de datos de la cooperativa
 */
export const actualizarCooperativa = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Identificador BSON de cooperativa inválido.' });
    }

    const { nombre, telefono, ciudad, limiteFlota, limiteVehiculos } = req.body || {};
    const updateData = {};

    if (nombre) updateData.nombre = String(nombre).trim();
    if (telefono) updateData.telefono = String(telefono).trim();
    if (ciudad) updateData.ciudad = String(ciudad).trim();
    if (limiteFlota || limiteVehiculos) {
      updateData.limiteFlota = Number(limiteFlota || limiteVehiculos);
    }

    const cooperativaActualizada = await Cooperativa.findByIdAndUpdate(
      id,
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
    return res.status(500).json({ success: false, error: 'Error al actualizar los datos de la cooperativa.' });
  }
};

export default {
  obtenerCooperativas,
  obtenerCooperativaPorId,
  crearCooperativa,
  cambiarEstadoCooperativa,
  actualizarCooperativa
};