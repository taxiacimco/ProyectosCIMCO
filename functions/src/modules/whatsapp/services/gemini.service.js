import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Servicio para interactuar con Google Gemini con redundancia de modelos.
 * Optimizado para TAXIA CIMCO con soporte de System Instructions.
 */
class GeminiService {
  constructor() {
    // La API KEY se recupera de las variables de entorno
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDVvwzVEUKGCtcJOKgROKQqzaUGpvmo_aU";
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Configuración de modelos para alta disponibilidad
    this.primaryModelName = "gemini-1.5-flash";
    this.backupModelName = "gemini-1.5-pro";
    
    // Inicialización del modelo principal por defecto
    this.model = this.genAI.getGenerativeModel({ model: this.primaryModelName });
  }

  /**
   * Genera una respuesta basada en el contexto de Taxia CIMCO.
   * Si el modelo principal falla, intenta con el modelo de respaldo.
   * @param {string} userMessage Mensaje recibido del usuario
   */
  async generateResponse(userMessage) {
    // El prompt ahora es el mensaje directo del usuario, 
    // ya que el contexto reside en la systemInstruction del método _callAi.
    const prompt = userMessage;

    try {
      // Intento 1: Con el modelo principal (Flash)
      return await this._callAi(this.primaryModelName, prompt);
    } catch (primaryError) {
      console.warn(`⚠️ Modelo ${this.primaryModelName} falló en TAXIA CIMCO. Intentando con respaldo...`);
      
      try {
        // Intento 2: Con el modelo de respaldo (Pro)
        return await this._callAi(this.backupModelName, prompt);
      } catch (backupError) {
        console.error("❌ Error crítico: Ambos modelos de IA fallaron:", backupError);
        return "Lo siento, en este momento tengo problemas técnicos para procesar tu solicitud en TaxiA CIMCO. Por favor intenta más tarde.";
      }
    }
  }

  /**
   * Método privado para realizar la llamada a la API con configuración de sistema.
   * @param {string} modelName Nombre del modelo a usar
   * @param {string} prompt Texto para la IA
   */
  async _callAi(modelName, prompt) {
    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: `Eres el asistente virtual oficial de TaxiA CIMCO, un sistema de logística y transporte. 
Tu tono debe ser amable, ágil y servicial.

REGLA OBLIGATORIA: Siempre que un cliente te salude por primera vez o inicie la conversación, DEBES responder exactamente con este mensaje:

"¡Hola! 👋 Gracias por contactar a *TaxiA CIMCO*. Soy tu soporte automatizado para coordinar tus necesidades de transporte en tiempo real. 

¿Qué servicio deseas gestionar el día de hoy? Responde con el número de tu elección:

1️⃣ Mototaxi
2️⃣ Motoparrillero
3️⃣ Motocarga
4️⃣ Intermunicipal"

Una vez que el cliente elija un número, ayúdalo a coordinar ese servicio específico solicitando su ubicación de origen y destino.`
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) throw new Error("Respuesta vacía de la API de Gemini");
    return text;
  }
}

// Exportación de instancia única para mantener el estado del servicio
export default new GeminiService();