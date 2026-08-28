// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\src\modules\usuarios\usuario.service.js
import mongoose from 'mongoose';

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

        const nuevoUsuario = new Usuario({
            ...datos,
            email: mailTarget,
            saldoWallet: datos.saldoWallet ?? datos.saldo ?? 0
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
        }).select('saldoWallet saldo nombre rol').lean();
    }

    async recargarSaldoDespachador({ targetId, montoNum }) {
        const Usuario = getUsuarioModel();
        const usuarioActualizado = await Usuario.findOneAndUpdate(
            { $or: [{ _id: targetId }, { uid: targetId }] },
            { $inc: { saldoWallet: montoNum, saldo: montoNum } },
            { new: true }
        );

        if (!usuarioActualizado) return null;

        return {
            saldoNuevo: usuarioActualizado.saldoWallet ?? usuarioActualizado.saldo ?? 0
        };
    }

    async ajustarSaldoBilletera({ targetId, montoNumerico }) {
        const Usuario = getUsuarioModel();
        let usuario = await Usuario.findOneAndUpdate(
            { $or: [{ _id: targetId }, { uid: targetId }] },
            { $inc: { saldoWallet: montoNumerico, saldo: montoNumerico } },
            { new: true }
        );

        if (!usuario && mongoose.models.Conductor) {
            usuario = await mongoose.models.Conductor.findOneAndUpdate(
                { $or: [{ _id: targetId }, { uid: targetId }] },
                { $inc: { saldoWallet: montoNumerico, saldo: montoNumerico } },
                { new: true }
            );
        }

        if (!usuario) return null;

        const nuevoSaldo = usuario.saldoWallet ?? usuario.saldo ?? 0;
        return {
            saldoActual: nuevoSaldo - montoNumerico,
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
        await usuario.save();

        return { saldoNuevo: usuario.saldoWallet };
    }
}

const usuarioServiceInstance = new UsuarioService();
export default usuarioServiceInstance;