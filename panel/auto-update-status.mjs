import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURACIÓN ---
// Define la carpeta donde se guardará el archivo status.json.
// Generalmente es la carpeta de hosting (panel/public).
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const STATUS_FILE = path.join(PUBLIC_DIR, 'status.json');
const SCRIPT_NAME = 'auto-update-status.mjs';

function getFormattedDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Genera y escribe el archivo status.json en la carpeta public.
 */
function updateStatusFile() {
    try {
        const now = new Date();
        const statusData = {
            // Usa un ID de proceso simple para identificar esta actualización
            deploymentId: process.pid, 
            status: 'success',
            message: 'Status file updated successfully before deployment.',
            updatedAt: getFormattedDate(now),
            timestamp: now.getTime(),
            environment: process.env.NODE_ENV || 'production'
        };

        // Asegura que la carpeta 'public' existe
        if (!fs.existsSync(PUBLIC_DIR)) {
            fs.mkdirSync(PUBLIC_DIR, { recursive: true });
            console.log(`[${SCRIPT_NAME}] Carpeta 'public' creada en: ${PUBLIC_DIR}`);
        }

        // Escribe el archivo JSON con formato legible
        fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf-8');

        console.log(`[${SCRIPT_NAME}] Éxito: Archivo status.json actualizado y guardado en: ${STATUS_FILE}`);
        console.log(`[${SCRIPT_NAME}] Fecha de actualización: ${statusData.updatedAt}`);
        
    } catch (error) {
        console.error(`[${SCRIPT_NAME}] ERROR al generar status.json:`, error.message);
        // El script Node.js termina con un código de error para que el proceso Batch lo detecte.
        process.exit(1); 
    }
}

// Ejecuta la función
updateStatusFile();