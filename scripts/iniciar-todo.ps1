# ============================================================
# Script: iniciar-todo.ps1
# Proyecto: TAXIA-CIMCO
# Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts\iniciar-todo.ps1
# Función: Orquestador principal de entorno (Local y Producción)
# ============================================================

Clear-Host
$ErrorActionPreference = "Stop"

# Configuración de Rutas base
$root = "C:\Users\Carlos Fuentes\ProyectosCIMCO"
$scripts = "$root\scripts"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "      SISTEMA TAXIA-CIMCO - GESTOR TOTAL     " -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan

function Mostrar-Menu {
    Write-Host "`n[1]" -NoNewline -ForegroundColor Yellow; Write-Host " Iniciar TODO el entorno LOCAL (Backend + Frontend + Webhook)"
    Write-Host "[2]" -NoNewline -ForegroundColor Yellow; Write-Host " Iniciar SOLO Backend (Firebase + Ngrok + Webhook)"
    Write-Host "[3]" -NoNewline -ForegroundColor Yellow; Write-Host " Iniciar SOLO Frontend (Vite)"
    Write-Host "[4]" -NoNewline -ForegroundColor Yellow; Write-Host " Desplegar a PRODUCCIÓN (Cloud)"
    Write-Host "[5]" -NoNewline -ForegroundColor Yellow; Write-Host " Alternar entorno (.env)"
    Write-Host "[6]" -NoNewline -ForegroundColor Yellow; Write-Host " Liberar Puertos (Limpieza profunda)"
    Write-Host "[0]" -NoNewline -ForegroundColor Red; Write-Host " Salir"
    return Read-Host "`nSelecciona una opción"
}

$option = Mostrar-Menu

switch ($option) {
    "1" {
        Write-Host "`n[!] Preparando entorno LOCAL COMPLETO..." -ForegroundColor Yellow
        
        # Paso 1: Limpieza de puertos
        Write-Host "[1/4] Limpiando puertos..." -ForegroundColor Gray
        & "$scripts\liberar-puertos.ps1"
        
        # Paso 2: Configurar modo desarrollo
        Write-Host "[2/4] Asegurando entorno de desarrollo..." -ForegroundColor Cyan
        & "$scripts\alternar-entorno.ps1" -Modo "development"
        
        # Paso 3: Lanzar Backend en ventana nueva (Este script ya maneja ngrok y webhooks)
        Write-Host "[3/4] Lanzando Backend y Webhooks..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$scripts\iniciar-backend.ps1'"
        
        # Pequeña pausa para que el backend inicie antes que el frontend
        Start-Sleep -Seconds 2
        
        # Paso 4: Lanzar Frontend en ventana nueva
        Write-Host "[4/4] Lanzando Frontend..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$scripts\iniciar-frontend.ps1'"
        
        Write-Host "`n✅ Sistema en marcha. Revisa las nuevas ventanas de PowerShell." -ForegroundColor Green
    }
    
    "2" {
        Write-Host "`n[!] Iniciando únicamente Backend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$scripts\iniciar-backend.ps1'"
    }

    "3" {
        Write-Host "`n[!] Iniciando únicamente Frontend..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$scripts\iniciar-frontend.ps1'"
    }
    
    "4" {
        Write-Host "`n[!] ATENCIÓN: Vas a desplegar a PRODUCCIÓN" -ForegroundColor Red
        $confirm = Read-Host "¿Estás seguro de subir cambios a la nube? (s/n)"
        if ($confirm -eq "s") {
            Write-Host "🚀 Iniciando despliegue..." -ForegroundColor Cyan
            & "$scripts\alternar-entorno.ps1" -Modo "production"
            & "$scripts\deploy-firebase.ps1"
        } else {
            Write-Host "Despliegue cancelado." -ForegroundColor Yellow
        }
    }
    
    "5" {
        Write-Host "`n Cambiando configuración de entorno..." -ForegroundColor Yellow
        & "$scripts\alternar-entorno.ps1"
    }

    "6" {
        Write-Host "`n Ejecutando limpieza de puertos..." -ForegroundColor Yellow
        & "$scripts\liberar-puertos.ps1"
        Write-Host "✅ Puertos liberados." -ForegroundColor Green
    }

    "0" { exit }
    
    default {
        Write-Host "❌ Opción no válida." -ForegroundColor Red
    }
}

Write-Host "`nProceso finalizado. Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor DarkGray
$null = [Console]::ReadKey($true)
