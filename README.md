# 🚖 TAXIA CIMCO – Plataforma Integral de Movilidad Inteligente

**TAXIA CIMCO** es una plataforma de movilidad de alto rendimiento diseñada bajo principios de **Arquitectura Hexagonal** y **Clean Code**. El sistema conecta pasajeros, conductores y despachadores mediante un ecosistema web progresivo (**PWA**) soportado sobre **Firebase Functions V2** y **Cloud Firestore**, con integración avanzada de **Google Gemini AI**.

---

## 📂 Estructura Real del Proyecto (Arquitectura Modular)

```bash
ProyectosCIMCO/
├── package.json                  # 📦 Orquestador Monorepo (Workspaces)
├── firebase.json                 # ⚙️ Configuración Global de Firebase
├── functions/                    # 🚀 BACKEND (Node.js 20 ESM)
│   ├── src/
│   │   ├── modules/              # Lógica de Negocio (Wallet, Rides, Auth)
│   │   ├── triggers/             # Eventos de Firestore (Ruta Sagrada)
│   │   ├── routes/               # Endpoints de API
│   │   └── config/               # Variables de entorno
│   └── package.json              # name: taxia-cimco-backend
│
├── frontend/                     # ⚛️ FRONTEND (React + Vite)
│   ├── src/                      # Componentes Ciber-Neo-Brutalistas
│   ├── public/                   # PWA Manifests y Assets
│   └── package.json              # name: taxia-cimco-frontend
│
└── database/                     # 🔐 Seguridad (Rules & Indexes)