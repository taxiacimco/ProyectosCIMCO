param()

# --- CONFIGURACIÓN ---
$PROJECT = "pelagic-chalice-467818-e1"
$REGION  = "us-central1"
$REPO    = "taxia-registry"
$SOURCE_DIR = "functions"
$IMAGE_NAME = "taxia"
$TAG = (Get-Date -Format "yyyyMMdd-HHmmss")
$IMAGE_BASE = "$REGION-docker.pkg.dev/$PROJECT/$REPO/$IMAGE_NAME"
$IMAGE = $IMAGE_BASE + ":" + $TAG

$services = @(
  @{ name = "taxia-api";       role = "passenger" },
  @{ name = "taxia-whatsapp";  role = "whatsapp" },
  @{ name = "taxia-maps";      role = "maps" },
  @{ name = "taxia-gemini";    role = "gemini" }
)

# Lista de nombres de secrets en Secret Manager (deben existir)
$secretNames = @(
  "ADMIN_SA",
  "WHATSAPP_TOKEN",
  "VERIFY_TOKEN",
  "WABA_ID",
  "WHATSAPP_PHONE_ID",
  "WHATSAPP_PHONE_NUMBER_ID",
  "GOOGLE_MAPS_API_KEY",
  "MAPS_KEY",
  "GEMINI_KEY",
  "GEMINI_API_KEY",
  "PROJECT_ID"
)

function Abort($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

Write-Host "👉 Ejecutando deploy_multi_service para proyecto $PROJECT en $REGION" -ForegroundColor Cyan

# Auth + config
& gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "No hay cuenta activa: ejecuta gcloud auth login" -ForegroundColor Yellow
}

& gcloud config set project $PROJECT | Out-Null

# Habilitar APIs
$apis = @("run.googleapis.com","artifactregistry.googleapis.com","cloudbuild.googleapis.com","secretmanager.googleapis.com")
foreach ($api in $apis) {
  Write-Host "Habilitando $api..."
  & gcloud services enable $api --project $PROJECT | Out-Null
}

# Crear repo Artifact Registry si no existe
Write-Host "`n-- Comprobando Artifact Registry repo '$REPO'..."
$exists = & gcloud artifacts repositories list --location=$REGION --project=$PROJECT --format="value(name)" 2>$null | Select-String -Pattern $REPO
if (-not $exists) {
  Write-Host "Repo no encontrado. Creando $REPO..."
  & gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION --description="Artifact repo for Taxia" --project=$PROJECT || Abort "No se pudo crear Artifact Registry repo"
} else {
  Write-Host "Repo $REPO ya existe."
}

# Build & push con Cloud Build
Write-Host "`n-- Construyendo y subiendo imagen con Cloud Build..."
if (-not (Test-Path -Path $SOURCE_DIR)) { Abort "No se encuentra la carpeta source: $SOURCE_DIR" }
$buildCmd = "gcloud builds submit `"$SOURCE_DIR`" --tag $IMAGE --project $PROJECT"
Write-Host "Comando: $buildCmd"
$buildResult = & gcloud builds submit "$SOURCE_DIR" --tag $IMAGE --project $PROJECT 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host $buildResult; Abort "gcloud builds submit falló." }
Write-Host "✅ Imagen construida y subida: $IMAGE" -ForegroundColor Green

# Deploy a Cloud Run (cada servicio)
Write-Host "`n-- Desplegando servicios Cloud Run..."
foreach ($svc in $services) {
  $svcName = $svc.name
  $roleVal = $svc.role

  Write-Host "`n--> Desplegando servicio: $svcName (ROLE=$roleVal)" -ForegroundColor Cyan

  # 1. Parte Base del Comando
  $cmdBase = @(
    "run", "deploy", $svcName,
    "--image", $IMAGE,
    "--region", $REGION,
    "--platform", "managed",
    "--allow-unauthenticated"
  )

  # 2. Variables de Entorno
  $envArg = "ROLE=$roleVal,PROJECT_ID=$PROJECT"
  $cmdEnv = @("--set-env-vars", $envArg)

  # 3. Secrets
  $cmdSecrets = @()
  foreach ($s in $secretNames) {
    $cmdSecrets += "--set-secrets"
    $cmdSecrets += "$s=$s:latest"
  }
  
  # 4. Combinar todas las partes en un solo array de argumentos
  $deployArgs = @($cmdBase) + $cmdEnv + $cmdSecrets + @("--project", $PROJECT)
  
  # 5. Convertir el array de argumentos en una ÚNICA cadena de texto
  $cmdString = "gcloud " + ($deployArgs -join " ")
  
  Write-Host "Comando final a ejecutar (usando Invoke-Expression):"
  Write-Host $cmdString

  Write-Host "Ejecutando deploy para $svcName..."
  
  # *** LA CORRECCIÓN CRÍTICA: USAR INVOKE-EXPRESSION ***
  # Esto garantiza que la cadena de comando se interprete correctamente.
  $output = Invoke-Expression $cmdString 2>&1
  
  # Revisión del código de salida y del output para errores reales
  if ($LASTEXITCODE -ne 0 -or ($output -like "*ERROR:*" -and $output -notlike "*WARNING:*")) {
    Write-Host $output
    Write-Host "❗ Deploy falló para $svcName. El servicio NO está desplegado." -ForegroundColor Red
  } else {
    Write-Host "✅ Servicio $svcName desplegado correctamente." -ForegroundColor Green
  }
}

Write-Host "`n-- URLs de servicios desplegados (después del deploy):" -ForegroundColor Yellow
foreach ($svc in $services) {
  $url = & gcloud run services describe $($svc.name) --region $REGION --format="value(status.url)" --project $PROJECT 2>$null
  if ($url) {
    Write-Host "$($svc.name) : $url"
  } else {
    Write-Host "$($svc.name) : URL no encontrada (posiblemente deploy fallido o aun en progreso)"
  }
}

Write-Host "`n-- Fin del deploy multi-service." -ForegroundColor Cyan