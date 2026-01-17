# ============================================================
# 🚀 AUTO-RUN TAXIA CIMCO v2
# Actualiza y despliega automáticamente el panel cada hora.
# Incluye notificaciones visuales (toast en Windows 10/11)
# ============================================================

# Muestra notificación de Windows
function Show-Notification {
    param(
        [string]$Title,
        [string]$Message,
        [string]$Type = "Info"
    )

    # Requiere módulo BurntToast (solo la primera vez)
    # Ya que el usuario ya lo instaló manualmente, solo lo importamos
    try {
        Import-Module BurntToast -ErrorAction Stop
    } catch {
        Write-Host "⚠️ Módulo BurntToast no disponible. Notificaciones desactivadas." -ForegroundColor Yellow
        return
    }

    $ToastSplat = @{
        Text = @($Title, $Message)
        AppLogo = "C:\Users\Carlos Fuentes\ProyectosCIMCO\panel\public\logo.png" # Si tienes un logo, si no, déjalo sin especificar
    }

    # Tipo de notificación para usar diferentes íconos
    switch ($Type) {
        "Success" { $ToastSplat.Text += "✅ Despliegue OK" }
        "Error" { $ToastSplat.Text += "❌ Despliegue Fallido" }
        default { $ToastSplat.Text += "ℹ️ Información" }
    }
    
    New-BurntToastNotification @ToastSplat
}

# ===========================================
# ⚙️ CONFIGURACIÓN
# ===========================================
# Se usa el directorio del script para evitar errores de path
$ScriptDir = (Get-Item -Path $PSScriptRoot).FullName
$LogFile = "$ScriptDir\auto-run.log"
$IntervalMinutes = 60  # tiempo entre ejecuciones
$DeploymentTarget = "pelagic-chalice-467818-e1-panel"
$NodeScriptPath = "$ScriptDir\auto-update-status.mjs"

# ===========================================
# 🧠 BUCLE PRINCIPAL
# ===========================================
Write-Host "==============================="
Write-Host "🕒 INICIO DE AUTO-ACTUALIZADOR TAXIA CIMCO - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "==============================="

while ($true) {
    $StartTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "🧠 [$StartTime] Ejecutando actualización de status.json..."

    try {
        # 1. Ejecutar el script Node para actualizar el JSON
        $NodeResult = & node $NodeScriptPath 2>&1
        Write-Host $NodeResult

        if ($NodeResult -match "Error" -or $LASTEXITCODE -ne 0) {
            throw "Error durante la ejecución del script Node."
        }

        # 2. Subir cambios a Firebase Hosting
        Write-Host "🌐 Subiendo cambios a Firebase Hosting (panel)..."
        $DeployResult = firebase deploy --only hosting:$DeploymentTarget 2>&1
        Write-Host $DeployResult

        if ($DeployResult -notmatch "Deploy complete") {
             throw "Error durante el despliegue de Firebase Hosting."
        }

        $SuccessMsg = "✅ Actualización y despliegue completados correctamente a las $(Get-Date -Format 'HH:mm:ss')."
        Write-Host $SuccessMsg -ForegroundColor Green
        Add-Content -Path $LogFile -Value "[$StartTime] OK - $SuccessMsg"

        # 🔔 Notificación de éxito
        Show-Notification -Title "TAXIA CIMCO" -Message "Panel sincronizado en Hosting." -Type "Success"
    }
    catch {
        $ErrorMsg = "❌ Error en la actualización o despliegue: $($_.Exception.Message)"
        Write-Host $ErrorMsg -ForegroundColor Red
        Add-Content -Path $LogFile -Value "[$StartTime] ERROR - $($_.Exception.Message)"

        # 🔔 Notificación de error
        Show-Notification -Title "TAXIA CIMCO" -Message "Fallo en la actualización. Revisar consola." -Type "Error"
    }

    # Esperar siguiente ciclo
    Write-Host "⏳ Esperando $IntervalMinutes minutos para la siguiente ejecución..."
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}