// Versión Arquitectura: V4.1 - Blindaje Criptográfico y Protección Anti-Timing Attacks
/**
 * utils/wompi-security.js
 * Misión: Centralizar la lógica de firmas para Checkout y validación de Webhooks con mitigación de ataques de sincronización.
 */
import crypto from 'crypto';

/**
 * Genera la firma de integridad para el Checkout de Wompi.
 * Fórmula Sagrada: referencia + monto_en_centavos + moneda + secreto_integridad
 */
export const generateWompiSignature = (reference, amountInCents, currency = 'COP') => {
    const secret = process.env.WOMPI_INTEGRITY_KEY || process.env.WOMPI_INTEGRITY_SECRET;
    
    if (!secret) {
        throw new Error("⚠️ [CONFIG ERROR] WOMPI_INTEGRITY_KEY no definida en el entorno.");
    }

    const chain = `${reference}${amountInCents}${currency}${secret}`;
    return crypto.createHash('sha256').update(chain).digest('hex');
};

/**
 * Valida la autenticidad de los datos recibidos en el Webhook.
 * 🛡️ PROTECCIÓN CONTRA TIMING ATTACKS IMPLEMENTADA
 */
export const validateWebhookSignature = (payload, xEventChecksum) => {
    const { data, timestamp } = payload;
    const { id, status, amount_in_cents } = data.transaction;
    const secret = process.env.WOMPI_EVENTS_SECRET;

    if (!secret) {
        throw new Error("⚠️ [CONFIG ERROR] WOMPI_EVENTS_SECRET no definido.");
    }

    const chain = `${id}${status}${amount_in_cents}${timestamp}${secret}`;
    const hash = crypto.createHash('sha256').update(chain).digest('hex');
    
    // 🛡️ PROTECCIÓN CONTRA TIMING ATTACKS
    try {
        const hashBuffer = Buffer.from(hash);
        const checksumBuffer = Buffer.from(xEventChecksum);
        
        if (hashBuffer.length !== checksumBuffer.length) return false;
        return crypto.timingSafeEqual(hashBuffer, checksumBuffer);
    } catch (error) {
        return false; // Falla segura si los buffers no se pueden crear
    }
};

export default {
    generateWompiSignature,
    validateWebhookSignature
};