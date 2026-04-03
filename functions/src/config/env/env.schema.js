import { z } from 'zod';

/**
 * PROYECTO: TAXIA CIMCO
 * Esquema de validación de variables de entorno (Zod)
 */
export const envSchema = z.object({
    // --- Configuración de Firebase / GCP ---
    CIMCO_PROJECT_ID: z.string().min(1).describe("ID del proyecto de Firebase/GCP."),
    WEB_API_KEY: z.string().min(1).describe("API Key pública para servicios de Firebase Client."),

    // --- Entorno de Ejecución ---
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    APP_PORT: z.coerce.number().default(5001).describe("Puerto para el servidor Express local."),
    CORS_ORIGIN: z.string().optional().default('*'),

    // --- Seguridad y Autenticación ---
    INTERNAL_API_SECRET: z.string().min(16).describe("Secreto para comunicaciones entre microservicios."),
    JWT_SECRET: z.string().min(16).describe("Clave para firma de tokens de usuario."),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // --- Rutas de Aplicación ---
    FRONTEND_RESET_URL: z.string().url().optional(),
    API_BASE_URL: z.string().url().describe("URL base del backend."),
    
    // --- Servicios Externos ---
    GEMINI_API_KEY: z.string().min(1).describe("Key para IA."),
    GOOGLE_MAPS_API_KEY: z.string().min(1).describe("Key para Mapas."),
    
    // --- WhatsApp Business API ---
    WHATSAPP_TOKEN: z.string().min(1),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1)
});

// Nota: Hemos eliminado el 'export type EnvConfig' porque no usamos TypeScript.