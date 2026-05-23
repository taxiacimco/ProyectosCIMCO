import jwt from 'jsonwebtoken';

// Leemos la clave del .env, si no existe usa la de respaldo por seguridad
const JWT_SECRET = process.env.JWT_SECRET || 'cimco_secret_key_2026';

// Middleware 1: Verificar validez del Token
export const verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ 
            success: false, 
            message: '❌ Acceso denegado: Token no proporcionado en las cabeceras (Authorization).' 
        });
    }

    try {
        // Manejamos el estándar "Bearer <token>"
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        
        // Desciframos el token con la firma secreta
        const verificado = jwt.verify(token, JWT_SECRET);
        
        // Inyectamos los datos del usuario en la petición (id, rol)
        req.usuario = verificado; 
        next();
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            message: '❌ Acceso denegado: El Token ha expirado o es inválido.' 
        });
    }
};

// Middleware 2: Verificar si el usuario autenticado es Admin/CEO
export const esAdmin = (req, res, next) => {
    if (req.usuario && req.usuario.rol === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: '❌ Acceso restringido: Se requieren privilegios de Admin/CEO para realizar esta transacción.' 
        });
    }
};