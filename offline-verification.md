# 🔌 Verificación de Modo Offline PWA – TAXIA CIMCO

Esta guía asegura que las Aplicaciones Web Progresivas (PWA) funcionen sin conexión utilizando Service Workers y Cache API.

---

## 1️⃣ Panel de Mantenimiento

### Pasos:
| Paso | Acción | URL |
|------|--------|-----|
| 1.1 | Abre la URL y deja que cargue completamente. | https://pelagic-chalice-467818-e1-panel.web.app |
| 1.2 | Espera que aparezca el Splash y luego el Panel. | |
| 1.3 | Desconecta tu red (modo avión / offline DevTools). | |
| 1.4 | Recarga la página (Ctrl+R o F5). | |

✅ **Resultado esperado:**
El Splash y el Panel deben mostrarse sin errores (`ERR_INTERNET_DISCONNECTED`).

---

## 2️⃣ Frontend Principal (Usuarios y Conductores)

| Paso | Acción | URL |
|------|--------|-----|
| 2.1 | Abre el sitio principal y entra a cualquier módulo. | https://pelagic-chalice-467818-e1.web.app |
| 2.2 | Desconecta la red. | |
| 2.3 | Recarga la página. | |

✅ **Resultado esperado:**
La interfaz se carga con la última vista disponible desde caché.

---

## 3️⃣ Confirmación Técnica (Chrome DevTools)

1. Abre **F12 → Application → Service Workers**
   - Debe decir: `Status: activated and running`.

2. En **Cache Storage**, verifica que existan:
   - `/splash.html`
   - `/panel-mantenimiento.html`
   - `/assets/`
   - `/icons/`
   - Archivos principales JS/CSS

3. En **Network**, al recargar offline:
   - La columna “Size” debe mostrar **(from ServiceWorker)** o **(disk cache)**.

---

## 4️⃣ Instalación como App (Android/Desktop)

1. Abre la web en Chrome.
2. Toca “Añadir a pantalla principal” o “Instalar app”.
3. Abre la app desde el ícono instalado.

✅ **Resultado esperado:**
La app se abre en modo pantalla completa (sin URL), mostrando el Splash incluso en modo avión.

---

📋 **Verificado por:**  
Carlos Mario Fuentes García  
**Proyecto:** TAXIA CIMCO  
**Fecha:** _(actualizar con la fecha del test)_
