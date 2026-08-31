// Versión Arquitectura: V20.04 - Lógica de actualización de estadoOperativo/isActive según umbral de saldo ($2.000 COP)
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.service.js

import mongoose from 'mongoose';

/**
 * Roles operativos sujetos a la regla de negocio de saldo mínimo ($2.000 COP)
 */
const ROLES_OPERATIVOS = [
    'Mototaxi', 'Motoparrillero', 'Motocarga', 'Despachador', 'Conductor', 
    'mototaxi', 'motoparrillero', 'motocarga', 'despachador', 'conductor'
];

const UMBRAL_MINIMO_OPERATIVO = 2000;

/**
 * Obtención dinámica del modelo de Usuario para evitar fallos de importación por rutas relativas.
 * Busca primero en los modelos registrados de Mongoose ('Usuario' / 'User') y cae en fallback seguro.
 */
const getUsuarioModel = () => {
    if (mongoose.models.Usuario) return mongoose.models.Usuario;
    if (mongoose.models.User) return mongoose.models.User;
    
    // Schema por defecto si no ha sido registrado en Mongoose previamente
    const usuarioSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
    return mongoose.model('Usuario', usuarioSchema, 'usuarios');
};

export class UsuarioService {

    /**
     * Auxiliar interno para evaluar y actualizar la disponibilidad del usuario/conductor según su saldo resultante.
     * Regla: Saldo < 2.000 COP => estadoOperativo = 'NO_DISPONIBLE', isActive = false
     *        Saldo >= 2.000 COP => estadoOperativo = 'DISPONIBLE', isActive = true
     */
    async _sincronizarEstadoPorSaldo(docUsuario) {
        if (!docUsuario) return docUsuario;

        const rolNormalizado = docUsuario.rol || docUsuario.role || '';
        const esRolOperativo = ROLES_OPERATIVOS.some(r => r.toLowerCase() === rolNormalizado.toLowerCase());

        // Si no es un rol operativo (ej. Pasajero, Admin central), no alteramos disponibilidad por saldo
        if (!esRolOperativo) {
            return docUsuario;
        }

        const saldoActual = docUsuario.saldoWallet ?? docUsuario.saldo ?? 0;
        const estaHabilitado = saldoActual >= UMBRAL_MINIMO_OPERATIVO;
        const nuevoEstadoOperativo = estaHabilitado ? 'DISPONIBLE' : 'NO_DISPONIBLE';

        docUsuario.estadoOperativo = nuevoEstadoOperativo;
        docUsuario.isActive = estaHabilitado;

        // Mantener sincronía de estado general si no está inactivo por causa administrativa previa
        if (docUsuario.estado !== 'INACTIVO') {
            docUsuario.estado = estaHabilitado ? 'ACTIVO' : 'BLOQUEADO';
        }

        if (typeof docUsuario.save === 'function') {
            return await docUsuario.save();
        } else {
            const Usuario = getUsuarioModel();
            return await Usuario.findByIdAndUpdate(
                docUsuario._id,
                { 
                    $set: { 
                        estadoOperativo: nuevoEstadoOperativo,
                        isActive: estaHabilitado,
                        ...(docUsuario.estado !== 'INACTIVO' && { estado: estaHabilitado ? 'ACTIVO' : 'BLOQUEADO' })
                    } 
                },
                { new: true }
            );
        }
    }

    async obtenerDirectorioGlobal() {
        const Usuario = getUsuarioModel();
        const usuariosMongo = await Usuario.find().lean();
        
        const mapaUnico = new Map();
        for (const u of usuariosMongo) {
            const key = u.email || u.telefono || u.uid || u._id.toString();
            if (!mapaUnico.has(key)) {
                mapaUnico.set(key, u);
            }
        }
        return Array.from(mapaUnico.values());
    }

    async obtenerUsuarios(rol) {
        const Usuario = getUsuarioModel();
        const filtro = rol ? { rol } : {};
        return await Usuario.find(filtro).lean();
    }

    async validarRegistroUnico({ email, correo, telefono, uid }) {
        const Usuario = getUsuarioModel();
        const mailTarget = email || correo;
        const condiciones = [];

        if (mailTarget) condiciones.push({ email: mailTarget }, { correo: mailTarget });
        if (telefono) condiciones.push({ telefono });
        if (uid) condiciones.push({ uid });

        if (condiciones.length === 0) return true;

        const existente = await Usuario.findOne({ $or: condiciones }).lean();
        if (existente) {
            const error = new Error("⚠️ El correo, teléfono o UID ingresado ya pertenece a otro usuario.");
            error.code = 'DUPLICATE_USER';
            throw error;
        }
        return true;
    }

    async registrarUsuario(datos) {
        const Usuario = getUsuarioModel();
        const mailTarget = datos.email || datos.correo;
        if (!mailTarget) {
            const error = new Error("⚠️ El correo electrónico es requerido.");
            error.code = 'MISSING_REQUIRED_FIELDS';
            throw error;
        }

        await this.validarRegistroUnico(datos);

        const saldoInicial = datos.saldoWallet ?? datos.saldo ?? 0;
        const rolNormalizado = datos.rol || datos.role || '';
        const esRolOperativo = ROLES_OPERATIVOS.some(r => r.toLowerCase() === rolNormalizado.toLowerCase());
        const estaHabilitado = !esRolOperativo || saldoInicial >= UMBRAL_MINIMO_OPERATIVO;

        const nuevoUsuario = new Usuario({
            ...datos,
            email: mailTarget,
            saldoWallet: saldoInicial,
            saldo: saldoInicial,
            estadoOperativo: datos.estadoOperativo || (estaHabilitado ? 'DISPONIBLE' : 'NO_DISPONIBLE'),
            isActive: datos.isActive ?? estaHabilitado
        });

        return await nuevoUsuario.save();
    }

    async obtenerUsuarioPorId(targetId) {
        const Usuario = getUsuarioModel();
        return await Usuario.findOne({
            $or: [{ _id: targetId }, { uid: targetId }]
        }).lean();
    }

    async actualizarUsuario(targetId, datos) {
        const Usuario = getUsuarioModel();
        
        // Si se incluye modificación de saldo en los datos de actualización, evaluar estados
        if (datos.saldoWallet !== undefined || datos.saldo !== undefined) {
            const saldoEvaluado = datos.saldoWallet ?? datos.saldo;
            const rolNormalizado = datos.rol || datos.role || '';
            const esRolOperativo = ROLES_OPERATIVOS.some(r => r.toLowerCase() === rolNormalizado.toLowerCase());
            
            if (esRolOperativo) {
                const estaHabilitado = saldoEvaluado >= UMBRAL_MINIMO_OPERATIVO;
                datos.estadoOperativo = estaHabilitado ? 'DISPONIBLE' : 'NO_DISPONIBLE';
                datos.isActive = estaHabilitado;
            }
        }

        return await Usuario.findOneAndUpdate(
            { $or: [{ _id: targetId }, { uid: targetId }] },
            { $set: datos },
            { new: true, runValidators: true }
        );
    }

    async eliminarUsuario(targetId) {
        const Usuario = getUsuarioModel();
        return await Usuario.findOneAndDelete({
            $or: [{ _id: targetId }, { uid: targetId }]
        });
    }

    async obtenerDespachadores() {
        const Usuario = getUsuarioModel();
        return await Usuario.find({ rol: 'DESPACHADOR' }).lean();
    }

    async asignarTerminalDespachador({ targetId, terminal_id, codigoDespachador }) {
        const Usuario = getUsuarioModel();
        return await Usuario.findOneAndUpdate(
            { $or: [{ _id: targetId }, { uid: targetId }] },
            { 
                $set: { 
                    terminal_id, 
                    ...(codigoDespachador && { codigoDespachador }) 
                } 
            },
            { new: true }
        );
    }

    async obtenerSaldoDespachador(targetId) {
        const Usuario = getUsuarioModel();
        return await Usuario.findOne({
            $or: [{ _id: targetId }, { uid: targetId }]
        }).select('saldoWallet saldo nombre rol estadoOperativo isActive').lean();
    }

    async recargarSaldoDespachador({ targetId, montoNum }) {
        const Usuario = getUsuarioModel();
        let usuario = await Usuario.findOne({ $or: [{ _id: targetId }, { uid: targetId }] });

        if (!usuario) return null;

        usuario.saldoWallet = (usuario.saldoWallet || 0) + montoNum;
        usuario.saldo = (usuario.saldo || 0) + montoNum;

        usuario = await this._sincronizarEstadoPorSaldo(usuario);

        const saldoNuevo = usuario.saldoWallet ?? usuario.saldo ?? 0;

        return {
            saldoNuevo,
            usuario
        };
    }

    async ajustarSaldoBilletera({ targetId, montoNumerico }) {
        const Usuario = getUsuarioModel();
        let usuario = await Usuario.findOne({ $or: [{ _id: targetId }, { uid: targetId }] });
        let esColeccionConductor = false;

        if (!usuario && mongoose.models.Conductor) {
            usuario = await mongoose.models.Conductor.findOne({ $or: [{ _id: targetId }, { uid: targetId }] });
            esColeccionConductor = true;
        }

        if (!usuario) return null;

        const saldoAnterior = usuario.saldoWallet ?? usuario.saldo ?? 0;
        const saldoCalculado = saldoAnterior + montoNumerico;

        usuario.saldoWallet = saldoCalculado;
        usuario.saldo = saldoCalculado;

        if (esColeccionConductor) {
            const estaHabilitado = saldoCalculado >= UMBRAL_MINIMO_OPERATIVO;
            usuario.estadoOperativo = estaHabilitado ? 'DISPONIBLE' : 'NO_DISPONIBLE';
            usuario.isActive = estaHabilitado;
            await usuario.save();
        } else {
            usuario = await this._sincronizarEstadoPorSaldo(usuario);
        }

        const nuevoSaldo = usuario.saldoWallet ?? usuario.saldo ?? 0;
        return {
            saldoActual: saldoAnterior,
            nuevoSaldo,
            usuario
        };
    }

    async recargarSaldo({ targetId, montoNumerico, tipoOperacion }) {
        const Usuario = getUsuarioModel();
        const delta = tipoOperacion === 'DEBITO' ? -Math.abs(montoNumerico) : Math.abs(montoNumerico);

        const usuario = await Usuario.findOne({ $or: [{ _id: targetId }, { uid: targetId }] });
        if (!usuario) {
            const err = new Error("Usuario no encontrado.");
            err.code = 'USER_NOT_FOUND';
            throw err;
        }

        const saldoActual = usuario.saldoWallet ?? usuario.saldo ?? 0;
        if (tipoOperacion === 'DEBITO' && saldoActual < Math.abs(montoNumerico)) {
            const err = new Error("Saldo insuficiente para realizar el débito.");
            err.code = 'INSUFFICIENT_BALANCE';
            throw err;
        }

        usuario.saldoWallet = (usuario.saldoWallet || 0) + delta;
        usuario.saldo = (usuario.saldo || 0) + delta;

        const usuarioActualizado = await this._sincronizarEstadoPorSaldo(usuario);

        return { 
            saldoNuevo: usuarioActualizado.saldoWallet ?? usuarioActualizado.saldo ?? 0,
            usuario: usuarioActualizado
        };
    }
}

const usuarioServiceInstance = new UsuarioService();
export default usuarioServiceInstance;