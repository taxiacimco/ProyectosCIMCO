/**
 * PROYECTO: TAXIA CIMCO
 * MÓDULO: Driver / Sentinel
 * SERVICIO: Vigilancia Centinela GPS
 * DESCRIPCIÓN: Verifica la salud del GPS de los conductores marcados como 'online'
 * ARQUITECTURA: ESM (Módulos de ECMAScript)
 */

import admin from 'firebase-admin';

/**
 * Verifica la salud del GPS de los conductores marcados como 'online'.
 * Se activa mediante el cron job programado en el index principal.
 * * @returns {Promise<Array|null>} Promesa con los resultados de las actualizaciones
 */
export const checkGpsHealth = async () => {
    const db = admin.firestore();
    
    // Obtenemos el tiempo actual en milisegundos
    const now = Date.now();
    
    // Umbral de inactividad: 60 segundos (1 minuto)
    const UMBRAL_INACTIVIDAD = 60000; 

    try {
        console.log('🛰️ [CIMCO-SENTINEL] Iniciando verificación de salud de dispositivos GPS...');

        // 1. Buscamos conductores en los roles de transporte que estén online
        // Nota: Se mantiene la ruta de colección original de TAXIA CIMCO
        const snap = await db.collection('artifacts/taxiacimco-app/public/data/usuarios')
            .where('online', '==', true)
            .where('rol', 'in', ['mototaxi', 'motocarga', 'motoparrillero', 'intermunicipal'])
            .get();

        if (snap.empty) {
            console.log('ℹ️ [SENTINEL] No hay conductores online para verificar.');
            return null;
        }

        const updates = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            
            // Conversión segura de Timestamp de Firestore a milisegundos
            const lastActive = data.lastActive ? data.lastActive.toMillis() : 0;

            // 2. Lógica de detección de desconexión
            if (now - lastActive > UMBRAL_INACTIVIDAD) {
                console.warn(`🚨 [SENTINEL] GPS inactivo detectado: ${data.nombre || doc.id}`);

                // Enviar notificación solo si el usuario tiene un token FCM registrado
                if (data.fcmToken) {
                    const message = {
                        token: data.fcmToken,
                        notification: {
                            title: '⚠️ SEÑAL GPS PERDIDA',
                            body: 'Tu GPS no está reportando. Abre la app para seguir recibiendo servicios.'
                        },
                        data: {
                            type: 'GPS_OFF_ALERT',
                            priority: 'high'
                        },
                        android: {
                            priority: 'high',
                            notification: {
                                channel_id: 'gps_alerts',
                                icon: 'stock_ticker_update',
                                color: '#00f2ff'
                            }
                        }
                    };

                    updates.push(admin.messaging().send(message));
                    
                    // Marcamos el estado en la base de datos para informar al panel administrativo
                    updates.push(doc.ref.update({ gpsStatus: 'warning' }));
                }
            } else {
                // 3. Restauración de estado saludable
                // Si el GPS está saludable y tenía un aviso previo, lo limpiamos
                if (data.gpsStatus === 'warning') {
                    console.log(`✅ [SENTINEL] GPS restaurado para: ${data.nombre || doc.id}`);
                    updates.push(doc.ref.update({ gpsStatus: 'active' }));
                }
            }
        });

        // Ejecutamos todas las promesas (notificaciones y updates) en paralelo
        const results = await Promise.all(updates);
        console.log(`📊 [SENTINEL] Verificación completada. Acciones realizadas: ${results.length}`);
        
        return results;

    } catch (error) {
        console.error("❌ [SENTINEL ERROR]: Error crítico en la vigilancia GPS:", error);
        throw error;
    }
};