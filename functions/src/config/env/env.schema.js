import { z } from 'zod';

/**
 * Define el esquema de las variables de entorno usando Zod.
 * Esto asegura que todas las variables requeridas existan y tengan el tipo correcto.
 * * Usamos z.object() para definir la forma esperada de las variables.
 */
export const envSchema = z.object({
    // Variables de configuración de Firebase/GCP
    PROJECT_ID: z.string().min(1).describe("ID del proyecto de Firebase/GCP. Necesario para inicializar varios SDKs."),
    WEB_API_KEY: z.string().min(1).describe("API Key pública del proyecto web. Usado a menudo para autenticación cliente/servidor."),

    // Variables del entorno de ejecución
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development').describe("Define el modo de ejecución para optimizaciones y logging."),
    // z.coerce.number() intenta convertir el valor a un número si es una cadena (ej. "3000" -> 3000)
    PORT: z.coerce.number().default(3000).describe("Puerto para el servidor Express local. Ignorado en Cloud Functions."),
    CORS_ORIGIN: z.string().optional().describe("Origen permitido para CORS en producción. Debe ser la URL de tu frontend."),

    // Configuración de la aplicación
    // El secreto debe ser de 16 caracteres o más por buenas prácticas.
    JWT_SECRET: z.string().min(16).describe("Clave secreta para firmar JWTs (Debe ser larga y compleja)."),
    // z.string().url() valida que la cadena sea una URL válida.
    FRONTEND_RESET_URL: z.string().url().describe("URL del frontend para el reseteo de contraseña. Ejemplo: 'https://mi-app.com/reset?token='"),

    // Claves de servicios externos (ejemplo)
    MAIL_SERVICE_API_KEY: z.string().optional().describe("Clave para el servicio de envío de emails. Opcional si no se requiere envío de emails transaccionales."),
});

// Extraemos el tipo de TypeScript del esquema de Zod
// Este tipo 'Env' lo usaremos en 'env.loader.ts' y en 'index.ts'
export type Env = z.infer<typeof envSchema>;