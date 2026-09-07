/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\utils\deduplicar.js
 * Misión: Deduplica arreglos de entidades (usuarios, conductores, pasajeros)
 * preservando la integridad de los identificadores de base de datos.
 */
export const deduplicarEntidades = (lista = []) => {
    if (!Array.isArray(lista)) return [];

    const mapa = new Map();

    lista.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;

        // 1. Identificador de base de datos nativo (MongoDB, Firestore o SQL)
        const idNativo = item._id?.toString() || item.id?.toString() || item.uid?.toString();

        // 2. Clave única de deduplicación priorizada
        const dedupKey = 
            idNativo || 
            item.cedula || 
            item.documentoIdentidad || 
            (item.email ? item.email.toLowerCase().trim() : null) || 
            item.telefonoMovil || 
            item.telefono ||
            `fallback-idx-${index}`; // Evita descartar objetos sin atributos mapeados

        if (!mapa.has(dedupKey)) {
            mapa.set(dedupKey, {
                ...item,
                // Preserva los identificadores originales sin sobrescribirlos con correos o teléfonos
                _id: item._id || idNativo,
                id: item.id || idNativo,
                // Clave limpia y garantizada para el prop 'key' en elementos JSX de React
                _reactKey: dedupKey,
                // Normalización de campos de visualización para la UI
                nombre: item.nombre || item.fullName || 'Usuario Sin Nombre',
                telefono: item.telefonoMovil || item.telefono || 'Sin Teléfono'
            });
        }
    });

    return Array.from(mapa.values());
};