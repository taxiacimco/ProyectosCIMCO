Proyecto TAXIA CIMCO - Panel de Estado y Auto-Actualización

Este repositorio contiene el código fuente para el Panel de Estado de TAXIA CIMCO, así como los scripts de automatización para mantenerlo actualizado y desplegado en Firebase Hosting.

El proceso central es un script de Node.js que utiliza el Firebase Admin SDK para verificar el estado de la base de datos (Firestore) y la autenticación, genera un archivo status.json y, finalmente, despliega el resultado usando Firebase CLI.

1. Configuración Inicial del Entorno

Para operar este sistema, necesitas tener instalado lo siguiente:

Dependencias Globales:

Node.js (v20+): Entorno de ejecución JavaScript.

Firebase CLI: La interfaz de línea de comandos de Firebase.

npm install -g firebase-tools
# Asegúrate de estar logueado
firebase login 


Dependencias del Proyecto:

Ejecuta esto dentro de la carpeta scripts:

cd C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts
npm install firebase-admin dotenv


Archivos de Credenciales y Entorno

Archivo

Ubicación

Propósito

serviceAccount.json

scripts/serviceAccount.json

Contiene las credenciales administrativas de Firebase, esencial para la conexión de backend con el Admin SDK. ¡CRÍTICO para la seguridad!

.env.production

functions/.env.production

Archivo que contiene variables de entorno. Asegúrate de que este archivo NO se suba a repositorios públicos (.gitignore).

2. Operación y Ejecución

El proceso de actualización se ejecuta mediante un único script de PowerShell.

A. Instalación de Notificaciones (BurntToast)

Para que Windows envíe notificaciones visuales (toast) de éxito o error, necesitas el módulo BurntToast.

Comando de instalación (Ejecutar solo una vez en PowerShell):

Install-Module -Name BurntToast -Scope CurrentUser -Force


(Nota: Si PowerShell te pide instalar NuGet, responde S (Sí) para continuar).

B. Ejecución en Primer Plano (Consola Visible)

Útil para pruebas y monitoreo inmediato.

cd "C:\Users\Carlos Fuentes\ProyectosCIMCO\scripts"
.\auto-run.ps1
