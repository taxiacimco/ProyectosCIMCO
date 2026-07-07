// Versión Arquitectura: V10.4 - Optimización Contra Bloqueos Globales por Lazy Loading de Dependencias Internas
/**
 * Ubicación: functions/src/modules/wallet/controllers/webhook.controller.js
 * Misión: Procesar notificaciones asíncronas de Wompi garantizando seguridad extrema y actualización atómica de billeteras.
 * Ajuste V10.4: Mitigación definitiva del "Timeout de 10000ms" en el arranque del emulador de Firebase en entornos Windows. 
 * Se remueven las importaciones globales estáticas y se implementa la inyección perezosa ("Lazy Loading") de `walletService` 
 * y `WompiSecurity` dentro de la firma de ejecución. Esto garantiza que el scope raíz del archivo sea de peso cero (0ms) 
 * durante el mapeo inicial del CLI de Firebase, encapsulando y protegiendo el ecosistema transaccional.
 */

import crypto from 'crypto';
import admin from 'firebase-admin';

// Inicialización segura del SDK de Admin para evitar fugas de memoria o errores de multi-instancia
if (!admin.apps.length) {
    admin.initializeApp();
}

// 🚀 FIRMA DE EXPORTACIÓN ESTRICTA (Coincide milimétricamente en index.js)
export const recibirAlertaWompi = async (req, res) => {
    // 🛡️ Log de depuración persistido de la V5.8
    console.log("📩 [Webhook] Body Completo recibido:", JSON.stringify(req.body, null, 2));

    try {
        const payload = req.body;
        
        // 🛡️ GUARDA DE SEGURIDAD ANTI-UNDEFINED (Fusión Estricta)
        if (!payload || !payload.event || !payload.data || !payload.data.transaction) {
            console.warn("⚠️ [Webhook] Estructura de transacción no encontrada o incompleta.");
            return res.status(400).json({
                success: false,
                message: '⚠️ ALERTA DE ARQUITECTURA: Estructura de payload inválida o incompleta enviada por la pasarela.'
            });
        }

        const { event, data, timestamp } = payload;
        const signaturePayload = payload.signature; // Mapeo desde V10.0
        const { transaction } = data;

        // --- BLINDAJE DE ARQUITECTURA: Validación de Referencia ---
        const reference = transaction.reference;
        if (!reference || typeof reference !== 'string') {
            console.error("❌ [CIMCO-ERROR] Referencia inválida recibida:", reference);
            return res.status(400).json({
                success: false,
                message: "Referencia mal formada o inexistente en el payload"
            });
        }
        // -----------------------------------------------------------

        // 🛡️ GUARDA DE SEGURIDAD ANTI-UNDEFINED (Datos específicos de Transacción)
        if (!transaction.id || !transaction.status || typeof transaction.amount_in_cents === 'undefined') {
            return res.status(400).json({
                success: false,
                message: '⚠️ ALERTA DE ARQUITECTURA: Datos internos de la transacción faltantes o corruptos.'
            });
        }

        // 🔐 VALIDACIÓN CRIPTOGRÁFICA HÍBRIDA (Capa de Seguridad Preservada + Mejora)
        const checksumHeader = req.headers['x-event-checksum'];
        const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

        let isValid = isEmulator;
        
        if (!isEmulator) {
            // 🚀 INYECCIÓN PEREZOSA (LAZY LOADING): Carga del módulo de seguridad solo en ejecución para proteger el arranque
            const WompiSecurityModule = await import("../../../utils/wompi-security.js");
            const WompiSecurity = WompiSecurityModule.default || WompiSecurityModule;

            // Capa 1: Validación base a través de WompiSecurity (V5.8)
            if (checksumHeader) {
                isValid = WompiSecurity.validateWebhookSignature(payload, checksumHeader);
            }
            
            // Capa 2: Fallback Manual SHA256 si la validación previa falló o falta el header (V10.0)
            if (!isValid && signaturePayload) {
                const secretEventos = process.env.WOMPI_EVENTS_SECRET;
                if (secretEventos) {
                    const cadenaFirma = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secretEventos}`;
                    const hashLocal = crypto.createHash('sha256').update(cadenaFirma).digest('hex');
                    isValid = (hashLocal === signaturePayload.checksum);
                } else {
                    console.error('[CIMCO-ERROR] Variable de entorno WOMPI_EVENTS_SECRET no configurada.');
                }
            }
        }

        if (!isValid) {
            console.warn(`[CIMCO-SEGURIDAD] 🚨 Intento de vulneración detectado. Checksum inválido para la referencia: ${reference}`);
            return res.status(200).json({ 
                status: 'security_check_failed', 
                reason: 'invalid_signature',
                message: '⚠️ ALERTA DE ARQUITECTURA: Firma criptográfica inválida. Petición rechazada por seguridad.'
            });
        }

        // 🛑 REGLA DE NEGOCIO RESTRICTIVA (CEO): BLOQUEO DE TARJETAS
        const metodoPago = transaction.payment_method_type ? transaction.payment_method_type.toUpperCase() : 'UNKNOWN';
        if (metodoPago === 'CARD' || metodoPago === 'TARJETA') {
            console.warn(`[CIMCO-FILTRO] Transacción rechazada. El método de pago '${metodoPago}' no está permitido en este ecosistema.`);
            return res.status(200).json({ 
                status: 'ignored', 
                reason: 'card_payments_not_allowed',
                message: '⚠️ ALERTA DE ARQUITECTURA: El uso de tarjetas de crédito/débito está deshabilitado. Solo PSE y transferencias.'
            });
        }

        // 🚀 PROCESAMIENTO ATÓMICO COEXISTENTE
        if (event === 'transaction.updated' || isEmulator) {
            console.log(`🔎 [Webhook] Procesando Transacción ID: ${transaction.id} para referencia: ${reference}`);

            // 1. Delegación al servicio original con Carga Dinámica (Preservado de V5.8)
            let serviceSuccess = false;
            try {
                const walletServiceModule = await import("../services/wallet.service.js");
                const walletService = walletServiceModule.default || walletServiceModule;
                
                const result = await walletService.processTransaction(transaction);
                serviceSuccess = result.success;
            } catch (svcErr) {
                console.warn(`⚠️ [CIMCO-WARN] Fallo interno en walletService. Procediendo a liquidación ACID de respaldo. Error: ${svcErr.message}`);
            }

            // 2. Transacción Nativa ACID Firestore (Motor V10.0 Integrado)
            if (transaction.status === 'APPROVED') {
                const montoCOP = Math.round(transaction.amount_in_cents / 100);
                const db = admin.firestore();

                const recargaQuery = await db.collection('recargas')
                    .where('reference', '==', reference)
                    .limit(1)
                    .get();

                if (recargaQuery.empty) {
                    console.error(`[CIMCO-ERROR] Registro de recarga pendiente no encontrado para la ref: ${reference}`);
                    return res.status(200).json({ status: 'ignored', reason: 'reference_not_found_in_db' });
                }

                const recargaDoc = recargaQuery.docs[0];
                const recargaData = recargaDoc.data();
                const { conductorId } = recargaData;

                if (!conductorId) {
                    return res.status(200).json({
                        status: 'ignored',
                        reason: 'corrupted_db_record',
                        message: '⚠️ ALERTA DE ARQUITECTURA: Registro de recarga sin conductorId asociado.'
                    });
                }

                // GUARDA DE IDEMPOTENCIA: Si walletService o un evento anterior ya la aprobó, frenamos la transacción
                if (recargaData.status === 'APPROVED') {
                    console.log(`[CIMCO-INFO] La recarga ${reference} ya había sido consolidada exitosamente.`);
                    return res.status(200).json({ 
                        received: true, 
                        message: "Transaction already processed", 
                        transactionId: transaction.id 
                    });
                }

                // Apertura de Bóveda Transaccional ACID
                const conductorRef = db.collection('conductors').doc(conductorId);
                
                await db.runTransaction(async (ts) => {
                    const conductorSnapshot = await ts.get(conductorRef);
                    if (!conductorSnapshot.exists) {
                        throw new Error(`El perfil del conductor ${conductorId} no existe en Firestore.`);
                    }

                    const datosConductor = conductorSnapshot.data();
                    const saldoActual = datosConductor.walletBalance || 0;
                    const nuevoSaldo = saldoActual + montoCOP;

                    // Actualizar saldo y aplicar Regla de Oro ($2,000 COP) para reactivación
                    const parchesConductor = { walletBalance: nuevoSaldo };
                    if (nuevoSaldo >= 2000 && (datosConductor.estado === 'offline' || !datosConductor.estado)) {
                        parchesConductor.estado = 'active';
                    }

                    ts.update(conductorRef, parchesConductor);
                    
                    // Sellar documento de recarga
                    ts.update(recargaDoc.ref, {
                        status: 'APPROVED',
                        wompiTransactionId: transaction.id,
                        paymentMethod: metodoPago,
                        processedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Auditoría Contable Inmutable
                    const historialRef = db.collection('historialSaldo').doc();
                    ts.set(historialRef, {
                        conductorId,
                        tipo: 'recarga_automatica',
                        monto: montoCOP,
                        saldoAnterior: saldoActual,
                        saldoNuevo: nuevoSaldo,
                        wompiId: transaction.id,
                        reference: reference,
                        metodoPago,
                        descripcion: `Recarga automatizada exitosa vía Wompi (${metodoPago}). Monto: $${montoCOP} COP.`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                });

                console.log(`[CIMCO-EXITO] Billetera del conductor ${conductorId} recargada atómicamente con $${montoCOP} COP.`);
                
                return res.status(200).json({ 
                    received: true, 
                    message: "Balance updated successfully via native ACID",
                    transactionId: transaction.id,
                    serviceFlag: serviceSuccess
                });

            } else {
                // Sincronización de transacciones declinadas o fallidas
                const db = admin.firestore();
                const recargaQuery = await db.collection('recargas')
                    .where('reference', '==', reference)
                    .limit(1)
                    .get();

                if (!recargaQuery.empty) {
                    await recargaQuery.docs[0].ref.update({
                        status: transaction.status,
                        wompiTransactionId: transaction.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`[CIMCO-INFO] Registro de recarga ajustado al estado comercial: ${transaction.status}`);
                }

                return res.status(200).json({ 
                    status: "processed_with_issues", 
                    reason: transaction.status 
                });
            }
        }

        // Ignorar eventos que no conciernen a la actualización de fondos
        return res.status(200).json({ status: "ignored", event: event });

    } catch (error) {
        console.error("❌ [Webhook Error Crítico]:", error.message);
        return res.status(500).json({ 
            success: false, 
            error: "Internal Server Error",
            details: error.message
        });
    }
};