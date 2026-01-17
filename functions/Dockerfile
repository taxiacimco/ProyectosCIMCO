# ======================================================
# Etapa 1: Builder (Instalación de dependencias de producción)
# ======================================================
# Usamos una imagen de Node.js robusta para la instalación de dependencias.
FROM node:20-slim AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de manifiesto para aprovechar la caché de Docker
COPY package.json package-lock.json ./

# Instala las dependencias de producción (omitiendo las de desarrollo)
RUN npm install --omit=dev

# ======================================================
# Etapa 2: Runner (Imagen final de ejecución para Cloud Run)
# ======================================================
# Usamos la imagen base optimizada para la ejecución
FROM node:20-slim AS runner

# Variables de entorno cruciales
ENV NODE_ENV production
ENV PORT 8080
EXPOSE 8080

# Establece el directorio de trabajo
WORKDIR /app

# 1. Copia las dependencias instaladas del 'builder'
COPY --from=builder /app/node_modules ./node_modules

# 2. Copia el resto del código fuente.
# ESTE PASO COPIA LA CARPETA 'src' (INCLUYENDO LOS ARCHIVOS .js CORREGIDOS)
COPY . .

# Comando de inicio: Ejecuta el script 'start' definido en package.json
CMD ["npm", "start"]