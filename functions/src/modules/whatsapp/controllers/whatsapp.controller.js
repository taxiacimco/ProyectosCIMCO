import HttpResponse from "../../../utils/http-response.js";
import geminiService from "../services/gemini.service.js";
import whatsappService from "../services/whatsapp.service.js";

/**
 * Controlador optimizado para la gestión de WhatsApp Business API y Gemini AI
 */
class WhatsAppController {
  /**
   * Verificación del Webhook para Meta (Configuración inicial)
   * Se ejecuta cuando configuras el webhook en el dashboard de Facebook.
   */
  async verifyWebhook(req, res) {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Usamos el token de tus variables de entorno (configuraremos esto en el siguiente paso)
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ [WhatsApp] Webhook verificado con éxito");
      return res.status(200).send(challenge);
    }

    console.error("❌ [WhatsApp] Fallo en la verificación del token");
    return res.status(403).send("Forbidden");
  }

  /**
   * Manejador de mensajes entrantes (POST)
   */
  async handleMessage(req, res) {
    try {
      const { body } = req;

      // 1. Validar que sea un evento de WhatsApp
      if (body.object !== "whatsapp_business_account") {
        return HttpResponse.notFound(res, "Not a WhatsApp event");
      }

      // Estructura de extracción segura para evitar errores de undefined
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      // 2. Procesar solo si es un mensaje de texto y no un estado (read/delivered)
      if (message && message.type === "text") {
        const from = message.from; // ID/Número del remitente
        const userText = message.text.body;
        const messageId = message.id;

        console.log(`📩 [WhatsApp] Nuevo mensaje de ${from}: ${userText}`);

        // A. Enviar reacción visual (🤖) para indicar que la IA está trabajando
        await whatsappService.sendReaction(from, messageId, "🤖");

        // B. Consultar a Gemini Service
        const aiResponse = await geminiService.generateResponse(userText);

        // C. Enviar la respuesta final al usuario
        await whatsappService.sendMessage(from, aiResponse);

        console.log(`🚀 [WhatsApp] Respuesta enviada a ${from}`);
      }

      // Siempre responder 200 a Meta para confirmar recepción, incluso si no es texto
      return HttpResponse.ok(res, { message: "Event processed" });
      
    } catch (error) {
      console.error("❌ [WhatsApp Controller Error]:", error);
      // Usamos tu manejador interno de errores
      return HttpResponse.internalError(res, "Error procesando el mensaje de WhatsApp");
    }
  }
}

export default new WhatsAppController();