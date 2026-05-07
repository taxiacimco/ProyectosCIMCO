// Versión Arquitectura: V1.1 - Webhook con Validación de Firma de Integridad
/**
 * modules/wallet/controllers/webhook.controller.js
 * Misión: Recibir y validar la autenticidad de los pagos de Wompi.
 */
import WalletService from "../services/wallet.service.js";
import WompiSecurity from "../../../utils/wompi-security.js";

export const handleWompiWebhook = async (req, res) => {
    try {
        const payload = req.body;
        const checksum = req.headers['x-event-checksum']; // Wompi envía la firma aquí

        // 🛡️ VALIDACIÓN DE SEGURIDAD CRÍTICA
        const isValid = WompiSecurity.validateWebhookSignature(payload, checksum);

        if (!isValid) {
            console.error("⚠️ [ALERTA DE SEGURIDAD] Intento de Webhook con firma inválida.");
            // Respondemos 200 para no dar pistas al atacante, pero ignoramos el proceso.
            return res.status(200).send({ message: "Security check failed" });
        }

        const { data, event } = payload;

        if (event === 'transaction.updated') {
            const result = await WalletService.processWompiWebhook(data.transaction);
            console.log(`🔔 [Webhook Wompi] Transacción ${data.transaction.reference} procesada.`);
            return res.status(200).send({ received: true });
        }

        return res.status(200).send({ message: "Evento no procesado" });

    } catch (error) {
        console.error("❌ [Webhook Error]:", error.message);
        return res.status(200).send({ error: error.message });
    }
};