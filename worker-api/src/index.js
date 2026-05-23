export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Salud del Sistema
    if (request.method === "GET" && url.pathname === "/") {
      return new Response("TAXIA API OPERATIVA - JAGUA DE IBIRICO", { status: 200 });
    }

    // 2. Webhook Oficial de Wompi
    if (request.method === "POST" && url.pathname === "/api/v1/wallet/webhook") {
      try {
        const body = await request.json();
        const transaction = body.data.transaction;

        // Solo procesamos si el pago fue APROBADO
        if (transaction.status === "APPROVED") {
          const emailConductor = transaction.customer_email;
          const montoPesos = transaction.amount_in_cents / 100;

          console.log(`✅ Procesando recarga de $${montoPesos} para: ${emailConductor}`);

          // Lógica de conexión con tu Firebase Emulator (Puerto 8080)
          // Usando las credenciales de env.FIREBASE_PROJECT_ID configuradas
          const firebaseUrL = `http://127.0.0.1:8080/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/wallets/${emailConductor}`;

          // Aquí el Worker enviará la orden de SUMAR el saldo
          // Nota: En producción usaremos el SDK de Admin, para pruebas locales
          // simulamos la respuesta exitosa.
        }

        return new Response(JSON.stringify({ received: true }), { 
          status: 200, 
          headers: { "Content-Type": "application/json" } 
        });
      } catch (err) {
        return new Response("Error de Webhook", { status: 400 });
      }
    }

    return new Response("No encontrado", { status: 404 });
  }
};