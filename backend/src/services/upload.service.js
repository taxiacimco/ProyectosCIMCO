// Versión Arquitectura: V1.1 - Servicio de extracción de archivos multimedia y documentos con doble exportación ESM (Named + Default)

/**
 * Servicio de Utilidad para Procesamiento y Extracción de Archivos Adjuntos (Multer/Cloudinary)
 * @module services/upload.service
 */

/**
 * Extrae y mapea las rutas/URLs de archivos cargados desde req.file o req.files en Express.
 *
 * @param {Array|Object} [files] - Colección de archivos adjuntos generados por Multer (req.files).
 * @param {Object} [singleFile] - Objeto de archivo único procesado por Multer (req.file).
 * @param {Object} [body={}] - Payload del cuerpo de la petición (opcional).
 * @returns {Object} Diccionario clave-valor con los nombres de campo y las rutas/URLs correspondientes.
 */
export const extractFiles = (files, singleFile, body = {}) => {
    const extracted = {};

    // 1. Procesamiento de archivo único (req.file)
    if (singleFile && typeof singleFile === 'object') {
        const pathValue = singleFile.path || singleFile.secure_url || singleFile.location || singleFile.filename || null;
        if (singleFile.fieldname && pathValue) {
            extracted[singleFile.fieldname] = pathValue;
        }
    }

    // 2. Procesamiento de múltiples archivos (req.files)
    if (files) {
        if (Array.isArray(files)) {
            files.forEach(file => {
                if (file && typeof file === 'object') {
                    const pathValue = file.path || file.secure_url || file.location || file.filename || null;
                    if (file.fieldname && pathValue) {
                        extracted[file.fieldname] = pathValue;
                    }
                }
            });
        } else if (typeof files === 'object') {
            Object.keys(files).forEach(key => {
                const fileArray = files[key];
                if (Array.isArray(fileArray) && fileArray.length > 0) {
                    const primaryFile = fileArray[0];
                    if (primaryFile && typeof primaryFile === 'object') {
                        const pathValue = primaryFile.path || primaryFile.secure_url || primaryFile.location || primaryFile.filename || null;
                        if (pathValue) {
                            extracted[key] = pathValue;
                        }
                    }
                } else if (fileArray && typeof fileArray === 'object') {
                    const pathValue = fileArray.path || fileArray.secure_url || fileArray.location || fileArray.filename || null;
                    if (pathValue) {
                        extracted[key] = pathValue;
                    }
                }
            });
        }
    }

    return extracted;
};

// Exportación por defecto para mantener compatibilidad con "import uploadService from ..."
export default {
    extractFiles
};