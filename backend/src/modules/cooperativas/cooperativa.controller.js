import Cooperativa from '../../models/Cooperativa.js';

// 📋 Obtener todas las cooperativas con sus despachadores y conductores poblados
export const obtenerCooperativas = async (req, res) => {
  try {
    const cooperativas = await Cooperativa.find()
      .populate('despachadores', 'nombre email telefono rol')
      .populate('conductoresAsignados', 'nombres apellidos placa telefono estado saldo')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
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

// ➕ Registrar nueva cooperativa
export const crearCooperativa = async (req, res) => {
  try {
    const { nombre, nit, telefono, ciudad, limiteFlota, limiteVehiculos } = req.body;

    if (!nombre || !nit) {
      return res.status(400).json({
        success: false,
        error: 'El nombre y el NIT son campos requeridos.'
      });
    }

    const nitLimpio = nit.trim();
    const existeNIT = await Cooperativa.findOne({ nit: nitLimpio });
    if (existeNIT) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una cooperativa registrada con este NIT.'
      });
    }

    const nuevaCooperativa = new Cooperativa({
      nombre: nombre.trim(),
      nit: nitLimpio,
      telefono: telefono ? telefono.trim() : '',
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

// 🔄 Cambiar estado (activa, inactiva, suspendida)
export const cambiarEstadoCooperativa = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const coop = await Cooperativa.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    if (!coop) {
      return res.status(404).json({ success: false, error: 'Cooperativa no encontrada.' });
    }

    return res.status(200).json({
      success: true,
      message: `Estado actualizado a: ${estado}`,
      data: coop
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error al actualizar estado.' });
  }
};