// Versión Arquitectura: V2.6 - Integración de Webhook Nombrado con Bypass para Emuladores
/**
 * modules/wallet/controllers/webhook.controller.js
 * Misión: Recibir y validar la autenticidad de los pagos de Wompi con soporte híbrido (Local/Producción).
 */
import { walletService } from "../services/wallet.service.js";
import WompiSecurity from "../../../utils/wompi-security.js";

export const webhookController = async (req, res) => {
    try {
        const payload = req.body;
        const checksum = req.headers['x-event-checksum']; // Firma enviada por Wompi
        
        // 🛡️ MODO DESARROLLO: Bypass de firma para pruebas locales
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

        console.log(`📩 [Webhook] Evento recibido: ${payload?.event || 'Desconocido'}`, JSON.stringify(payload?.data || {}));

        // 1. Bloqueo inmediato si es producción y no hay firma
        if (!isEmulator && !checksum) {
            console.error("❌ [Webhook] Intento sin firma en producción.");
            return res.status(401).send({ status: 'unauthorized' });
        }

        // 2. Validación de Seguridad Condicional
        let isValid = true;
        if (!isEmulator) {
            isValid = WompiSecurity.validateWebhookSignature(payload, checksum);
        } else {
            console.log("⚠️ [MODO DESARROLLO] Bypass de firma criptográfica activado para pruebas locales.");
        }

        // 3. Manejo de firma inválida (Respuesta 200 para evitar Timing/Reconnaissance Attacks)
        if (!isValid) {
            console.error("⚠️ [ALERTA DE SEGURIDAD] Intento de Webhook con firma inválida.");
            return res.status(200).send({ status: 'security_check_failed' });
        }

        const { data, event } = payload;

        // 4. Procesamiento de la Transacción
        if (event === 'transaction.updated') {
            // Delegación a la capa de servicio (Arquitectura Hexagonal)
            const result = await walletService.processTransaction(data.transaction);
            
            console.log(`🔔 [Webhook Wompi] Transacción ${data.transaction.reference} procesada con éxito.`);
            return res.status(200).send({
                status: 'success',
                processed: result
            });
        }

        return res.status(200).send({ status: 'ignored' });

    } catch (error) {
        console.error("❌ [Webhook Error]:", error.message);
        return res.status(500).send({ 
            error: "Internal Server Error",
            message: error.message 
        });
    }
};