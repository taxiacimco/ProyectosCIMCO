import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Servicio para interactuar con Google Gemini con redundancia de modelos
 */
class GeminiService {
  constructor() {
    // La API KEY debe estar en tus variables de entorno (.env)
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDVvwzVEUKGCtcJOKgROKQqzaUGpvmo_aU";
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Configuramos los nombres de los modelos: Principal y Respaldo
    this.primaryModelName = "gemini-1.5-flash";
    this.backupModelName = "gemini-1.5-pro";
    
    // Inicializamos el modelo principal por defecto
    this.model = this.genAI.getGenerativeModel({ model: this.primaryModelName });
  }

  /**
   * Genera una respuesta basada en el contexto de Taxia CIMCO.
   * Si el modelo principal falla, intenta con el modelo de respaldo.
   * @param {string} userMessage Mensaje recibido del usuario
   */
  async generateResponse(userMessage) {
    const prompt = `
        Eres el asistente virtual de Taxia CIMCO. 
        Tu objetivo es ayudar a los usuarios a pedir un taxi o resolver dudas sobre el servicio.
        Responde de forma amable, corta y profesional.
        
        Contexto del mensaje del usuario: ${userMessage}
    `;

    try {
      // Intento 1: Con el modelo principal (Flash)
      return await this._callAi(this.primaryModelName, prompt);
    } catch (primaryError) {
      console.warn(`⚠️ Modelo ${this.primaryModelName} falló. Intentando con respaldo...`);
      
      try {
        // Intento 2: Con el modelo de respaldo (Pro)
        return await this._callAi(this.backupModelName, prompt);
      } catch (backupError) {
        console.error("❌ Ambos modelos de IA fallaron:", backupError);
        return "Lo siento, en este momento tengo problemas técnicos para procesar tu solicitud. Por favor intenta más tarde.";
      }
    }
  }

  /**
   * Método privado para realizar la llamada a la API
   * @param {string} modelName Nombre del modelo a usar
   * @param {string} prompt Texto para la IA
   */
  async _callAi(modelName, prompt) {
    const model = this.genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) throw new Error("Respuesta vacía de la IA");
    return text;
  }
}

export default new GeminiService();