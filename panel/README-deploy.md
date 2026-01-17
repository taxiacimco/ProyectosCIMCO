# 🚀 Despliegue del Panel TAXIA CIMCO

## 1️⃣ Subir a GitHub
- Crea un nuevo repositorio.
- Sube la carpeta `panel/` completa.
- Incluye `.gitignore` para evitar `node_modules`.

## 2️⃣ Conectar a Render.com
1. Inicia sesión en https://render.com
2. Conecta tu cuenta de GitHub.
3. Crea un nuevo **Web Service**.
4. Configura:
   - Root Directory: `panel`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Runtime: Node 18+
   - Environment variables:
     ```
     PORT=3000
     POWERSHELL_PATH=/usr/bin/pwsh
     SCRIPTS_PATH=/opt/render/project/src/scripts
     API_KEY=a1b0e9a692bd470d842cdb4d813be21e
     MAIL_HOST=smtp.gmail.com
     MAIL_PORT=587
     MAIL_USER=taxiacimco@gmail.com
     MAIL_PASS=<TU_CLAVE_APP_GMAIL_AQUI>
     ```

## 3️⃣ Desplegar
Render instalará dependencias y ejecutará el panel automáticamente.
Al finalizar te mostrará una URL pública, por ejemplo:
