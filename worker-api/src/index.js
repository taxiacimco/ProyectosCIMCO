export default {
  async fetch(request, env, ctx) {
    // 1. Permitir solo peticiones POST (lo que envía Wompi)
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const data = body.data.transaction;

        console.log("💰 Pago recibido de Wompi:", data.id, data.status);

        // 2. Solo procesar si el pago es exitoso
        if (data.status === "APPROVED") {
          const montoEnPesos = data.amount_in_cents / 100;
          
          // AQUÍ CONECTAREMOS CON FIRESTORE REST API
          // Para que los conductores vean su saldo actualizado al instante.
          console.log(`✅ Acreditando $${montoEnPesos} al conductor.`);
        }

        return new Response(JSON.stringify({ status: "received" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response("Error procesando Webhook", { status: 400 });
      }
    }

    return new Response("TAXIA API OPERATIVA", { status: 200 });
  },
};