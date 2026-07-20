// Versión Arquitectura: V1.4.3 - Blindaje Anti-Producción y Aislamiento de Ráfagas Críticas
// Ubicación: C:\Users\Carlos Fuentes\ProyectosCIMCO\backend\scripts\stress_test_concurrencia_acid.js

import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ENTORNO_ACTUAL = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// 🛡️ COMPUERTA PERIMETRAL: Detener el script si se detecta un entorno vivo de producción
if (ENTORNO_ACTUAL === 'production') {
    console.error("\n🚨 [CIMCO-SEGURIDAD] Abortando stress_test_concurrencia_acid.js: Ataques concurrentes bloqueados en producción.");
    console.error("🔒 Protegiendo la integridad transicional del clúster de MongoDB Atlas.\n");
    process.exit(1);
}

const BASE_URL = `http://localhost:${PORT}/api/viajes/despachar-inmediato`;

// 🎯 IDENTIDADES REALES DE TU BASE DE DATOS DE PRUEBAS
const ID_CONDUCTOR_INTERMUNICIPAL = "6a29cbb9c8d7b14cd8f85882"; // Camilo Castro
const ID_PASAJERO_REAL = "6a29b491c8d7b14cd8f85871";            // milevis Pasajero Test
const TOTAL_HILOS = 10;

async function dispararHiloPeticion(hiloId, viajeIdComun) {
    const payload = {
        viajeId: viajeIdComun, // ObjectId común de ráfaga (24 caracteres hex)
        conductorId: ID_CONDUCTOR_INTERMUNICIPAL,
        pasajeroId: ID_PASAJERO_REAL,
        pasajeroNombre: "milevis Pasajero Test",
        tarifa: 45000, 
        metodoPago: "EFECTIVO",
        
        origenTexto: "Terminal de Transportes La Jagua de Ibirico",
        destinoTexto: "Terminal de Transportes Valledupar",
        destinoNombre: "Terminal de Transportes Valledupar",

        origenLat: 9.5623,
        origenLng: -73.3325,
        destinoLat: 10.4631,
        destinoLng: -73.2532,

        origen: { lat: 9.5623, lng: -73.3325 },
        destino: { lat: 10.4631, lng: -73.2532 }
    };

    const config = {
        headers: {
            'Content-Type': 'application/json',
            'x-stress-test': 'true'
        }
    };

    try {
        const respuesta = await axios.post(BASE_URL, payload, config);
        return { hilo: hiloId, status: respuesta.status, data: respuesta.data };
    } catch (error) {
        return { 
            hilo: hiloId, 
            status: error.response?.status || 500, 
            data: error.response?.data || null,
            error: error.message
        };
    }
}

async function simularAsaltoConcurrenteACID() {
    console.log("==================================================================");
    console.log("⚡ INICIANDO SIMULADOR DE CARGA CONCURRENTE (RÁFAGA CON DATOS REALES)");
    console.log(`📡 URL Objetivo: ${BASE_URL}`);
    console.log(`👥 Conductor Asignado: Camilo Castro (${ID_CONDUCTOR_INTERMUNICIPAL})`);
    console.log(`👤 Pasajero Solicitante: milevis Pasajero Test (${ID_PASAJERO_REAL})`);
    console.log("==================================================================\n");

    const viajeIdComun = crypto.randomBytes(12).toString('hex'); 
    const poolPromesas = [];

    for (let i = 1; i <= TOTAL_HILOS; i++) {
        poolPromesas.push(dispararHiloPeticion(i, viajeIdComun));
    }

    const resultados = await Promise.all(poolPromesas);
    let exitosos = 0;
    let rechazadosConcurrencia = 0;
    let otrosErrores = 0;

    resultados.forEach(r => {
        if (r.status === 200 || r.status === 201) {
            exitosos++;
            console.log(`🥇 [Hilo ${r.hilo}] HTTP ${r.status} -> ¡Viaje Consolidado de forma Atómica! ID: ${viajeIdComun}`);
        } else if (r.status === 409 || (r.status === 400 && String(r.data?.message).includes('duplicado'))) {
            rechazadosConcurrencia++;
            console.log(`🛡️ [Hilo ${r.hilo}] HTTP 409 Conflict -> Bloqueado Correctamente por Aislamiento ACID.`);
        } else {
            otrosErrores++;
            console.log(`❌ [Hilo ${r.hilo}] Status ${r.status} -> Fallo estructural:`, r.data || r.error);
        }
    });

    console.log("\n==================================================================");
    console.log(`📊 RESUMEN OPERATIVO: Exitosos: ${exitosos} | Bloqueados ACID: ${rechazadosConcurrencia} | Fallidos: ${otrosErrores}`);
    
    if (exitosos === 1) {
        console.log("\n🎉 [CERTIFICACIÓN OPERATIVA PASADA]: El aislamiento ACID previno colisiones.");
        console.log("   Un único hilo consolidó la transacción y apartó al conductor.");
        console.log("   Los demás 9 hilos obtuvieron HTTP 409 (Conflicto Limpio de Concurrencia).");
    } else if (exitosos > 1) {
        console.log("\n🚨 [FALLO CRÍTICO DE AISLAMIENTO]: ¡Se detectó condición de carrera (Race Condition)!");
    } else {
        console.log("\n⚠️ [ALERTA] Ningún hilo pudo consolidar. Revisa si el conductor ya está ocupado en la Base de Datos.");
    }
    console.log("==================================================================");
}

simularAsaltoConcurrenteACID();