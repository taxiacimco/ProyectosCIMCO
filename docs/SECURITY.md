# 🔒 Guía de Seguridad – TaxiA-CIMCO

Este documento describe las **prácticas de seguridad** que deben cumplirse en el desarrollo y despliegue de este proyecto.

---

## 🚫 Archivos que **NUNCA** deben subirse al repositorio

1. **Variables de entorno**  
   - `.env` (tanto en frontend como en `functions/`)
   - Archivos `.env.*` de cualquier tipo

2. **Credenciales privadas**  
   - `functions/serviceAccountKey.json` (clave del Firebase Admin SDK)

3. **Tokens o claves expuestas en el código**  
   - API Keys de Firebase, Google Maps, Gemini o WhatsApp Business  
   - Cualquier **Bearer Token** de APIs

---

## 🛡️ Buenas prácticas

- ✅ Mantener todas las claves en archivos `.env` (ya están en `.gitignore`).  
- ✅ Usar **dotenv** en `functions/` para cargar las claves de forma local.  
- ✅ Para producción, usar **Firebase Secrets** o **Google Cloud Secret Manager** en lugar de `.env`.  
- ✅ Rotar (regenerar) las claves si existe sospecha de exposición.  

---

## 🔑 Regenerar credenciales en caso de filtración

### 1. Firebase Service Account
1. Ir a [Google Cloud Console – IAM & Admin](https://console.cloud.google.com/iam-admin/serviceaccounts).  
2. Seleccionar el proyecto **pelagic-chalice-467818-e1**.  
3. Elegir la cuenta de servicio usada en `serviceAccountKey.json`.  
4. Generar una **nueva clave JSON** y reemplazar la antigua en `functions/`.  
5. Revocar la clave anterior desde la consola para evitar uso indebido.

### 2. Firebase Web API Key
1. Ir a [Google Cloud Console – APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).  
2. Regenerar la **Web API Key**.  
3. Actualizar el valor en `.env` y en el frontend.  
4. Re-deploy del proyecto.

### 3. WhatsApp Business Token
1. Ingresar a [Meta for Developers – WhatsApp Business](https://developers.facebook.com/).  
2. Generar un **nuevo token de acceso** en la app correspondiente.  
3. Guardarlo en `.env` (`WHATSAPP_TOKEN`).  
4. Invalidar el token anterior.

### 4. Google Maps API Key
1. Entrar a [Google Cloud Console – Maps Platform](https://console.cloud.google.com/google/maps-apis/credentials).  
2. Regenerar la **API Key**.  
3. Actualizar en `.env`.  
4. Limitar la nueva API Key a dominios o apps autorizadas.

### 5. Gemini API Key
1. Ir a [Google AI Studio](https://aistudio.google.com/).  
2. Regenerar la **Gemini API Key**.  
3. Guardarla en `.env`.  
4. Eliminar la clave filtrada.

---

## 🚨 En caso de emergencia

1. **Revocar inmediatamente todas las claves expuestas.**  
2. **Actualizar el `.gitignore`** (si el archivo sensible se subió por error).  
3. **Eliminar los commits con datos sensibles** de la historia de Git usando [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) o `git filter-repo`.  
4. **Volver a desplegar** el proyecto con las nuevas credenciales.  

---

## ✅ Resumen
- `.env` y `serviceAccountKey.json` **NUNCA** van al repositorio.  
- Usar `.gitignore` (ya configurado).  
- Regenerar credenciales inmediatamente en caso de exposición.  
- Considerar migrar a **Google Cloud Secret Manager** para mayor seguridad en producción.

---
