// Script de Diagnóstico Rápido - TAXIA CIMCO
// Ejecutar con Node.js o probar la función desde la consola del navegador.

const API_BASE_URL = "http://localhost:8081/api"; // O usa tu URL de Ngrok

async function probarAceptacionViaje() {
    console.log(`🚀 Iniciando prueba de comunicación hacia: ${API_BASE_URL}/viajes/aceptar`);

    const payload = {
        viajeId: "TEST-VIAJE-123",
        viaNotificacion: true
    };

    try {
        const respuesta = await fetch(`${API_BASE_URL}/viajes/aceptar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Simulamos las cabeceras requeridas por SecurityConfig
                'Accept': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        // Verificamos el código HTTP (Ej: 200 OK, 409 Conflict, 403 Forbidden)
        console.log(`📡 Código de Estado HTTP: ${respuesta.status}`);

        const data = await respuesta.json();
        console.log("📦 Respuesta del Backend (Java):", data);

        if (respuesta.ok) {
            console.log("✅ ÉXITO: Comunicación bidireccional establecida. CORS configurado correctamente.");
        } else {
            console.error("⚠️ ADVERTENCIA: La API respondió, pero con un error lógico (Ej: Viaje no existe). Esto es normal en pruebas sintéticas.");
        }

    } catch (error) {
        console.error("❌ ERROR CRÍTICO DE RED:", error.message);
        console.error("   Posibles causas: Backend apagado, puerto incorrecto o bloqueo por CORS.");
    }
}

probarAceptacionViaje();