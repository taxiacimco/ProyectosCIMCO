// Versión Arquitectura: V2.8 - Sincronización con Servicio Default y Bypass de Emulador
/**
 * modules/wallet/controllers/webhook.controller.js
 * Misión: Orquestar la recepción de eventos de Wompi y validar la seguridad de la petición.
 */
import walletService from "../services/wallet.service.js"; // ✅ Importación default corregida
import WompiSecurity from "../../../utils/wompi-security.js";

export const webhookController = async (req, res) => {
    try {
        const payload = req.body;
        const checksum = req.headers['x-event-checksum'];
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

        console.log(`📩 [Webhook] Evento Recibido: ${payload?.event}`);

        // 🛡️ VALIDACIÓN DE SEGURIDAD (Bypass solo en emulador local para pruebas rápidas)
        let isValid = isEmulator;
        if (!isEmulator) {
            isValid = WompiSecurity.validateWebhookSignature(payload, checksum);
        }

        if (!isValid) {
            console.error("⚠️ [ALERTA] Firma de Webhook inválida o intento de suplantación.");
            return res.status(200).send({ status: 'security_check_failed' });
        }

        const { data, event } = payload;

        if (event === 'transaction.updated') {
            // 🚀 Invocación al método unificado processTransaction
            const result = await walletService.processTransaction(data.transaction);
            
            return res.status(200).send({
                status: 'success',
                processed: result.success
            });
        }

        return res.status(200).send({ status: 'ignored' });

    } catch (error) {
        console.error("❌ [Webhook Error]:", error.message);
        return res.status(500).send({ error: error.message });
    }
};