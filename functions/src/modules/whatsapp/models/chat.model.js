import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();
// ID de tu proyecto para organizar los documentos en Firestore
const appId = 'taxia-cimco-app'; 

class ChatModel {
  /**
   * Guarda un mensaje en el historial del usuario (máximo 15 mensajes)
   * @param {string} waId - ID de WhatsApp del usuario
   * @param {string} role - 'user' o 'model'
   * @param {string} content - Texto del mensaje
   */
  async saveMessage(waId, role, content) {
    // Ruta estructurada: /artifacts/{appId}/public/data/whatsapp_history/{waId}
    const chatRef = db
      .collection('artifacts')
      .doc(appId)
      .collection('public')
      .doc('data')
      .collection('whatsapp_history')
      .doc(waId);
    
    const newMessage = {
      role,
      parts: [{ text: content }],
      timestamp: new Date().toISOString()
    };

    try {
      const doc = await chatRef.get();
      if (!doc.exists) {
        await chatRef.set({ 
          messages: [newMessage], 
          lastUpdate: new Date() 
        });
      } else {
        const history = doc.data().messages || [];
        history.push(newMessage);
        
        // Mantenemos solo los últimos 15 mensajes para no saturar el contexto de la IA
        const limitedHistory = history.slice(-15);
        await chatRef.update({ 
          messages: limitedHistory,
          lastUpdate: new Date()
        });
      }
    } catch (error) {
      console.error("Error al guardar en ChatModel:", error);
    }
  }

  /**
   * Recupera el historial para enviarlo a Gemini
   * @param {string} waId - ID de WhatsApp
   */
  async getHistory(waId) {
    try {
      const chatRef = db
        .collection('artifacts')
        .doc(appId)
        .collection('public')
        .doc('data')
        .collection('whatsapp_history')
        .doc(waId);
        
      const doc = await chatRef.get();
      if (doc.exists) {
        return doc.data().messages.map(m => ({
          role: m.role,
          parts: m.parts
        }));
      }
      return [];
    } catch (error) {
      console.error("Error al obtener historial:", error);
      return [];
    }
  }
}

export default new ChatModel();