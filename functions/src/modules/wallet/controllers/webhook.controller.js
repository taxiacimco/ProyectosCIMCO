// Versión Arquitectura: V5.8 - Extracción Robusta de Payload Wompi y Persistencia de Capa de Seguridad
/**
 * functions/src/modules/wallet/controllers/webhook.controller.js
 * Misión: Validar, normalizar y procesar de forma segura el payload del webhook de Wompi.
 * Integra validación de firmas criptográficas con manejo de errores de ruteo.
 */

import walletService from "../services/wallet.service.js"; 
import WompiSecurity from "../../../utils/wompi-security.js";

export const webhookController = async (req, res) => {
    // 🛡️ Log de depuración para inspeccionar el body real en la Terminal 2
    console.log("📩 [Webhook] Body Completo:", JSON.stringify(req.body, null, 2));

    try {
        const payload = req.body;
        const checksum = req.headers['x-event-checksum'];
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

        // 🛡️ CAPA DE SEGURIDAD (Persistida según Regla de Oro 2)
        let isValid = isEmulator;
        if (!isEmulator) {
            isValid = WompiSecurity.validateWebhookSignature(payload, checksum);
        }

        if (!isValid) {
            console.error("⚠️ [ALERTA] Firma de Webhook inválida o intento de suplantación.");
            return res.status(200).json({ status: 'security_check_failed', reason: 'invalid_signature' });
        }

        // 🚀 EXTRACCIÓN ROBUSTA (Ajuste Integrado)
        // La estructura estándar de Wompi sitúa el objeto 'transaction' dentro de 'data'
        const transaction = payload?.data?.transaction;

        if (!transaction) {
            console.warn("⚠️ [Webhook] Estructura de transacción no encontrada en el body.");
            return res.status(200).json({ status: "ignored", reason: "no_transaction_data" });
        }

        // Solo procesamos si el evento es de actualización de transacción o si estamos forzando prueba
        if (payload.event === 'transaction.updated' || isEmulator) {
            console.log(`🔎 [Webhook] Procesando Transacción ID: ${transaction.id} para ${transaction.customer_email}`);

            // Delegar la lógica atómica al servicio (Garantiza Regla de Oro 1 internamente)
            const result = await walletService.processTransaction(transaction);

            if (result.success) {
                return res.status(200).json({ 
                    received: true, 
                    message: "Balance updated successfully",
                    transactionId: transaction.id 
                });
            } else {
                return res.status(200).json({ 
                    status: "processed_with_issues", 
                    reason: result.status 
                });
            }
        }

        return res.status(200).json({ status: "ignored", event: payload.event });

    } catch (error) {
        console.error("❌ [Webhook Error]:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: "Internal Server Error" 
        });
    }
};