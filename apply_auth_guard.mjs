// Archivo: apply_auth_guard.mjs
// Ejecutar con: node apply_auth_guard.mjs

import * as fs from 'fs';
import * as path from 'path';

// Definición de las aplicaciones y el archivo principal para inyectar el guard
// Rutas de Panel/Dashboard (requieren rol específico)
const APP_CONFIGS = [
    { dir: 'pasajero', role: 'pasajero', file: 'panel-pasajero.html' }, 
    { dir: 'mototaxi', role: 'mototaxi', file: 'mototaxi-panel.html' },
    { dir: 'motoparrillero', role: 'motoparrillero', file: 'panel-parrillero.html' },
    { dir: 'motocarga', role: 'motocarga', file: 'panel-motocarga.html' },
    { dir: 'interconductor', role: 'interconductor', file: 'panel-interconductor.html' },
    { dir: 'pasajero-corporativo', role: 'pasajero_corporativo', file: 'panel-corporativo.html' },
    { dir: 'despachador', role: 'despachador', file: 'panel-despachador.html' },
    { dir: 'admin', role: 'admin', file: 'ceo-dashboard.html' },
];

// Rutas de Login (no requieren rol, solo chequean si ya están autenticados)
const LOGIN_PAGES = [
    { dir: 'pasajero', role: 'NONE_REQUIRED', file: 'login-pasajero.html' },
    { dir: 'mototaxi', role: 'NONE_REQUIRED', file: 'login-mototaxi.html' },
    { dir: 'motoparrillero', role: 'NONE_REQUIRED', file: 'login-parrillero.html' },
    { dir: 'motocarga', role: 'NONE_REQUIRED', file: 'login-motocarga.html' },
    { dir: 'interconductor', role: 'NONE_REQUIRED', file: 'login-interconductor.html' },
    { dir: 'pasajero-corporativo', role: 'NONE_REQUIRED', file: 'login-corporativo.html' },
    { dir: 'despachador', role: 'NONE_REQUIRED', file: 'login-despachador.html' },
    { dir: 'admin', role: 'NONE_REQUIRED', file: 'login-ceo.html' },
    // Añadir el login principal
    { dir: '', role: 'NONE_REQUIRED', file: 'login.html' }, 
];

const ALL_CONFIGS = [...APP_CONFIGS, ...LOGIN_PAGES];

const GUARD_IMPORT_CODE = `
<!-- AUTOMATICALLY ADDED AUTH GUARD SCRIPT -->
<script type="module">
import { checkAuthAndRedirect } from '/js/auth-guard.js';
</script>
`;

/**
 * Función que inyecta el código de chequeo de autenticación en la cabecera del HTML.
 * @param {string} htmlPath - Ruta completa al archivo HTML.
 * @param {string} requiredRole - El rol requerido para la página, o 'NONE_REQUIRED' para logins.
 */
function injectAuthGuard(htmlPath, requiredRole) {
    let content = fs.readFileSync(htmlPath, 'utf8');
    
    // El código de llamada que debe estar al final del módulo.
    const CALL_CODE = `checkAuthAndRedirect('${requiredRole}');`;

    // 1. Verificación: Evitar inyecciones duplicadas
    if (content.includes(CALL_CODE)) {
        // console.log(`➡️ Ya existe código de guardia para ${requiredRole} en ${htmlPath}. Saltando.`);
        return;
    }

    // 2. Inyectar el import en el <head>
    if (!content.includes(GUARD_IMPORT_CODE.trim())) {
        content = content.replace('</head>', GUARD_IMPORT_CODE + '</head>');
    }
    
    // 3. Buscar el primer <script type="module"> y añadir el código de llamada.
    const moduleScriptRegex = /<script type="module">/;
    
    // Asegura que el CALL_CODE esté después del import
    if (content.includes('</script>')) {
        // Inyecta justo antes del cierre del body (que debe ser el último script si no hay otros módulos)
        content = content.replace('</body>', `\n<script type="module">${CALL_CODE}</script>\n</body>`);
    } else {
        // Fallback: Si no hay body, no podemos inyectar. (Debe haber body)
        content = content.replace('</html>', `\n<body>\n<script type="module">${CALL_CODE}</script>\n</body>\n</html>`);
    }
    

    fs.writeFileSync(htmlPath, content, 'utf8');
    console.log(`🟢 Éxito: Guardia de rol '${requiredRole}' inyectada en ${path.basename(htmlPath)} (${config.dir})`);
}


// --- LÓGICA PRINCIPAL ---
console.log("Iniciando inyección de Guardia de Autenticación en archivos HTML...");

ALL_CONFIGS.forEach(config => {
    // La ruta es: [Raíz del proyecto]/frontend/public/[dir]/[file]
    const htmlPath = path.join(process.cwd(), 'frontend', 'public', config.dir, config.file); 
    
    try {
        if (!fs.existsSync(htmlPath)) {
            // console.warn(`⚠️ Advertencia: Archivo no encontrado en la ruta esperada: ${htmlPath}.`);
            return;
        }
        const roleToUse = config.role;
        injectAuthGuard(htmlPath, roleToUse);
    } catch (error) {
        console.error(`❌ ERROR procesando ${config.dir}/${config.file}:`, error.message);
    }
});

console.log("\nProceso de inyección finalizado. Vuelve a ejecutar si no ves todos tus archivos.");