/**
 * Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\src\utils\deduplicar.js
 * Misión: Deduplica arreglos de entidades (usuarios, conductores, pasajeros)
 * evaluando ID único, documento, correo o teléfono.
 */
export const deduplicarEntidades = (lista = []) => {
    if (!Array.isArray(lista)) return [];

    const mapa = new Map();

    lista.forEach((item) => {
        if (!item) return;

        // Extraer clave única priorizando _id, id, uid, cédula, correo o teléfono
        const key = 
            item._id?.toString() || 
            item.id?.toString() || 
            item.uid?.toString() || 
            item.cedula || 
            item.documentoIdentidad || 
            (item.email ? item.email.toLowerCase().trim() : null) || 
            item.telefonoMovil || 
            item.telefono;

        if (key && !mapa.has(key)) {
            mapa.set(key, {
                ...item,
                // Normaliza atributo 'id' para keys en renderizado JSX de React
                id: key,
                nombre: item.nombre || item.fullName || 'Usuario Sin Nombre',
                telefono: item.telefonoMovil || item.telefono || 'Sin Teléfono'
            });
        }
    });

    return Array.from(mapa.values());
};