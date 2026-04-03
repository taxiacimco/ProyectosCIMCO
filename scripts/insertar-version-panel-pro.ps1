# ============================================================
# Script: insertar-version-panel-pro.ps1
# Descripción: Inserta el panel de versión moderno (con degradado animado y modal)
#              en todas las vistas administrativas del proyecto TAXIA-CIMCO.
# Autor: Carlos Mario Fuentes García
# ============================================================

$base = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend\public\admin"
$archivos = Get-ChildItem -Path $base -Filter "*.html" -Recurse

Write-Host "============================================================"
Write-Host " INSERTANDO PANEL DE VERSIÓN MODERNO EN LAS VISTAS ADMINISTRATIVAS"
Write-Host "============================================================"

# HTML del panel y modal
$panelHtml = @'
<!-- 🌈 Panel de versión con degradado animado -->
<div id="version-panel" onclick="mostrarInfoVersion()" style="
  position:fixed;
  bottom:14px;
  right:14px;
  background:linear-gradient(135deg,#00bcd4,#3f51b5,#9c27b0);
  background-size:300% 300%;
  animation:gradienteFlujo 6s ease infinite;
  color:white;
  font-family:'Segoe UI',sans-serif;
  font-size:13px;
  padding:8px 14px;
  border-radius:10px;
  cursor:pointer;
  box-shadow:0 0 8px rgba(0,255,255,0.6);
  transition:transform 0.2s ease,box-shadow 0.2s ease;
  z-index:9999;">
  🚀 TAXIA-CIMCO — <span id="version-info">Cargando...</span>
</div>

<!-- Modal informativo -->
<div id="version-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;align-items:center;justify-content:center;">
  <div style="background:#fff;padding:20px;border-radius:12px;width:350px;box-shadow:0 0 20px rgba(0,255,255,0.4);text-align:center;font-family:'Segoe UI',sans-serif;">
    <h3>Información del Despliegue</h3>
    <p id="modal-version"></p>
    <p id="modal-fecha"></p>
    <p id="modal-entorno"></p>
    <p id="modal-notas"></p>
    <button onclick="cerrarInfoVersion()" style="background:#3f51b5;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:10px;">Cerrar</button>
  </div>
</div>

<script>
async function mostrarInfoVersion() {
  const modal = document.getElementById("version-modal");
  try {
    const versionData = await fetch("/version.json").then(r => r.json());
    document.getElementById("modal-version").innerText = "Versión: " + versionData.version;
    document.getElementById("modal-fecha").innerText = "Fecha: " + versionData.fecha;
    document.getElementById("modal-entorno").innerText = "Entorno: Producción";
    document.getElementById("modal-notas").innerText = "Último despliegue automático exitoso.";
    document.getElementById("version-info").innerText = versionData.version;
  } catch (e) {
    document.getElementById("version-info").innerText = "Error al cargar versión";
  }
  modal.style.display = "flex";
}
function cerrarInfoVersion() {
  document.getElementById("version-modal").style.display = "none";
}
</script>

<style>
@keyframes gradienteFlujo {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
'@

# Inserción en los archivos HTML
foreach ($archivo in $archivos) {
    $contenido = Get-Content $archivo.FullName -Raw
    if ($contenido -notmatch 'id="version-panel"') {
        $nuevoContenido = $contenido -replace '(?i)</body>', "$panelHtml`r`n</body>"
        Set-Content -Path $archivo.FullName -Value $nuevoContenido -Encoding UTF8
        Write-Host "✅ Panel insertado en: $($archivo.Name)"
    } else {
        Write-Host "ℹ️ Ya existía en: $($archivo.Name)"
    }
}

Write-Host "============================================================"
Write-Host " INSERCIÓN COMPLETADA EXITOSAMENTE"
Write-Host "============================================================"
