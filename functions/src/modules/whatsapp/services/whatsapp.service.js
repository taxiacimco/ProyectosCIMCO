import axios from "axios";

/**
 * Servicio para interactuar con la API de WhatsApp Business
 */
class WhatsAppService {
  constructor() {
    // Estas variables las registraremos en el siguiente paso en config/env
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiVersion = "v21.0"; // Versión estable de la Graph API
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  /**
   * Envía un mensaje de texto simple a un usuario
   * @param {string} to Número del destinatario
   * @param {string} text Cuerpo del mensaje
   */
  async sendMessage(to, text) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "text",
          text: { body: text },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("❌ [WhatsApp Service Error]:", error.response?.data || error.message);
      throw new Error("No se pudo enviar el mensaje de WhatsApp");
    }
  }

  /**
   * Envía una reacción a un mensaje específico
   * @param {string} to Número del destinatario
   * @param {string} messageId ID del mensaje al que se reacciona
   * @param {string} emoji El emoji de la reacción (ej: "🤖")
   */
  async sendReaction(to, messageId, emoji) {
    try {
      await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: to,
          type: "reaction",
          reaction: {
            message_id: messageId,
            emoji: emoji,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      // No lanzamos error para no interrumpir el flujo principal si falla una reacción
      console.warn("⚠️ [WhatsApp Service] No se pudo enviar la reacción");
    }
  }
}

export default new WhatsAppService();