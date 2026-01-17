# 🚖 TAXIA CIMCO – Plataforma Integral de Movilidad Inteligente

**TAXIA CIMCO** es una plataforma de movilidad digital que conecta pasajeros, conductores y empresas mediante un ecosistema web progresivo (**PWA**) soportado sobre **Firebase** y con integración de **WhatsApp Business API** para comunicación instantánea.  
El sistema incluye paneles de control para administración, mantenimiento, y gestión en tiempo real de viajes y operaciones.

---

## 📂 Estructura del Proyecto

```bash
ProyectosCIMCO/
├── functions/                    # Backend con Firebase Cloud Functions
│   ├── index.js                  # Lógica principal (API, eventos, triggers)
│   ├── package.json              # Dependencias backend
│   ├── .env.production           # Variables de entorno (no se sube a GitHub)
│   └── serviceAccountKey.json    # 🔒 Clave privada Firebase Admin SDK
│
├── frontend/                     # Frontend público (PWA)
│   ├── public/                   # HTML, CSS, JS, manifest y service workers
│   │   ├── admin/                # Panel del CEO y administración
│   │   ├── pasajero/             # App del pasajero
│   │   ├── mototaxi/             # App de conductores mototaxi
│   │   ├── motoparrillero/       # App de conductores parrilleros
│   │   ├── motocarga/            # App de carga
│   │   ├── interconductor/       # App intermunicipal
│   │   ├── despachador/          # Panel de despacho y monitoreo
│   │   ├── manifest.json         # Configuración PWA
│   │   └── service-worker.js     # Cache y modo offline
│   ├── firebase.json             # Configuración Firebase Hosting del frontend
│   └── vite.config.mjs           # Configuración Vite (build frontend)
│
├── panel/                        # Panel de mantenimiento técnico
│   ├── public/
│   │   ├── splash.html           # Pantalla de carga animada (Splash)
│   │   ├── manifest.json         # Manifest específico del panel
│   │   ├── service-worker.js     # PWA offline cache
│   │   ├── panel-mantenimiento.html
│   │   ├── assets/               # Logos y favicons
│   │   └── icons/                # Íconos PWA (192x192 / 512x512)
│   └── firebase.json             # Configuración Hosting exclusiva del panel
│
├── scripts/                      # Automatización y tareas administrativas
│   ├── auto-update-status.mjs    # Actualiza status.json de Firestore
│   ├── run-background.vbs        # Ejecuta scripts en segundo plano
│   ├── verificar-firebase.ps1    # Verifica configuración de Firebase
│   └── iniciar-frontend.ps1      # Abre el frontend localmente
│
├── database/
│   ├── firestore.rules           # 🔐 Reglas de seguridad Firestore
│   ├── firestore.indexes.json    # Índices de consultas Firestore
│
├── functions-piloto/             # Entorno paralelo para pruebas (sandbox)
├── logs/                         # Logs automáticos del backend
├── .firebaserc                   # Proyecto Firebase activo
├── firebase.json                 # Configuración global (hosting + functions)
├── firestore.rules               # Reglas principales de Firestore
├── storage.rules                 # 🔐 Reglas de seguridad para Cloud Storage
├── offline-verification.md       # Guía para pruebas de modo offline PWA
└── README.md                     # Documentación del proyecto
