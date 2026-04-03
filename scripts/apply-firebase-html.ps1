# apply-firebase-html.ps1
# Ejecutar desde: C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend (recomendado)
# Crea backup y ajusta todos los HTML en frontend\public

$projectRoot = "C:\Users\Carlos Fuentes\ProyectosCIMCO\frontend"
$publicRoot = Join-Path $projectRoot "public"

if (-not (Test-Path $publicRoot)) {
    Write-Error "No encontré la carpeta pública: $publicRoot. Ajusta la variable \$publicRoot si es necesario."
    exit 1
}

# Backup
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path $publicRoot ("backups_html_$timestamp")
Write-Host "Creando backup en: $backupRoot"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

# Bloques a insertar
$adminInsert = @"
<!-- Firebase PRODUCCIÓN exclusivo para ADMIN (insertado automáticamente) -->
<script type="module" src="/js/firebase/firebase-loader-admin.js"></script>
"@.Trim()

$publicInsert = @"
<!-- APP_ENV + mode-manager (insertado automáticamente) -->
<script>
  window.APP_ENV = "prod";
</script>
<script type="module" src="/js/firebase/firebase-mode-manager.js"></script>
"@.Trim()

# Encuentra todos los .html
$files = Get-ChildItem -Path $publicRoot -Recurse -Filter *.html -File

$modified = @()
$skipped = @()
$errors = @()

foreach ($f in $files) {
    try {
        $relPath = $f.FullName.Substring($publicRoot.Length).TrimStart('\','/')
        # crear carpeta de backup espejo
        $backupFileDir = Split-Path (Join-Path $backupRoot $relPath) -Parent
        if (-not (Test-Path $backupFileDir)) { New-Item -ItemType Directory -Path $backupFileDir -Force | Out-Null }
        Copy-Item -Path $f.FullName -Destination (Join-Path $backupRoot $relPath) -Force

        $content = Get-Content -Raw -LiteralPath $f.FullName -ErrorAction Stop

        $isAdmin = $f.FullName -match "[\\\/]admin[\\\/]"   # true si está en carpeta admin

        if ($isAdmin) {
            # Si ya contiene firebase-loader-admin o firebase-loader-admin.js no insertar
            if ($content -match "firebase-loader-admin" -or $content -match "/js/firebase/firebase-loader-admin.js") {
                $skipped += $relPath
                continue
            }

            # Insertar antes de </head> si existe, sino al inicio del archivo
            if ($content -match "(?i)</head>") {
                $newContent = $content -replace "(?i)</head>", "$([regex]::Escape("`n$adminInsert`n"))</head>"
                # la sustitución puede escapar la línea; mejor construir directamente:
                $newContent = $content -replace "(?i)</head>", "`n$adminInsert`n</head>"
            } else {
                $newContent = "$adminInsert`n`n" + $content
            }

            # Guardar
            Set-Content -LiteralPath $f.FullName -Value $newContent -Force
            $modified += $relPath

        } else {
            # Público/general
            # Si ya contiene firebase-mode-manager o window.APP_ENV no insertar por defecto (evita duplicados)
            if ($content -match "firebase-mode-manager" -or $content -match "window\.APP_ENV") {
                $skipped += $relPath
                continue
            }

            if ($content -match "(?i)</head>") {
                $newContent = $content -replace "(?i)</head>", "`n$publicInsert`n</head>"
            } else {
                $newContent = "$publicInsert`n`n" + $content
            }

            Set-Content -LiteralPath $f.FullName -Value $newContent -Force
            $modified += $relPath
        }
    } catch {
        $errors += @{ file = $f.FullName; error = $_.Exception.Message }
    }
}

# Resultado
Write-Host "--------------------------------------"
Write-Host "Backups guardados en: $backupRoot"
Write-Host "Archivos modificados: $($modified.Count)"
if ($modified) { $modified | ForEach-Object { Write-Host "  + $_" } }
Write-Host "Archivos saltados (ya con configuraciones): $($skipped.Count)"
if ($skipped) { $skipped | ForEach-Object { Write-Host "  - $_" } }
if ($errors.Count -gt 0) {
    Write-Host "Errores: $($errors.Count)"; $errors | ForEach-Object { Write-Host "  ! $($_.file) -> $($_.error)" }
}
Write-Host "--------------------------------------"
Write-Host "Lista completa de backups y archivos modificados en: $backupRoot"
Write-Host "Si quieres revertir un archivo, copia desde el backup correspondiente."
