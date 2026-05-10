// Versión Arquitectura: V4.3 - Sincronización de Secretos y Preparación Cloudflare con Blindaje Activo
/**
 * utils/wompi-security.js
 * Misión: Validar firmas de Wompi usando secretos en Google Cloud, manteniendo protección Anti-Timing Attacks.
 */
import crypto from 'crypto';

class WompiSecurity {
    /**
     * Genera la firma de integridad para el Checkout de Wompi.
     * Fórmula Sagrada: referencia + monto_en_centavos + moneda + secreto_integridad
     */
    generateWompiSignature(reference, amountInCents, currency = 'COP') {
        const secret = process.env.WOMPI_INTEGRITY_KEY || process.env.WOMPI_INTEGRITY_SECRET;
        
        if (!secret) {
            throw new Error("⚠️ [CONFIG ERROR] WOMPI_INTEGRITY_KEY no definida en el entorno.");
        }

        const chain = `${reference}${amountInCents}${currency}${secret}`;
        return crypto.createHash('sha256').update(chain).digest('hex');
    }

    /**
     * Valida la firma del webhook enviada por Wompi.
     * Importante: En producción, estos secretos vienen de firebase functions:secrets:get
     * 🛡️ PROTECCIÓN CONTRA TIMING ATTACKS IMPLEMENTADA
     */
    validateWebhookSignature(payload, xEventChecksum) {
        const { data, timestamp } = payload;
        const { id, status, amount_in_cents } = data.transaction;
        
        // 🔐 Usamos el secreto registrado en Google Cloud / .env.local
        const secret = process.env.WOMPI_EVENTS_SECRET;

        if (!secret) {
            console.error("⚠️ [ALERTA] WOMPI_EVENTS_SECRET no configurado.");
            return false;
        }

        // Construcción de la Cadena Sagrada de Validación
        const chain = `${id}${status}${amount_in_cents}${timestamp}${secret}`;
        const hash = crypto.createHash('sha256').update(chain).digest('hex');
        
        // 🛡️ MANTENIMIENTO DE FUSIÓN ATÓMICA: Comparación segura contra ataques de tiempo
        try {
            const hashBuffer = Buffer.from(hash);
            const checksumBuffer = Buffer.from(xEventChecksum || '');
            
            if (hashBuffer.length !== checksumBuffer.length) return false;
            return crypto.timingSafeEqual(hashBuffer, checksumBuffer);
        } catch (error) {
            console.error("❌ [SEGURIDAD] Error en validación de buffers de firma.");
            return false; // Falla segura
        }
    }
}

export default new WompiSecurity();