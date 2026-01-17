// modules/password/services/email.service.js
import resetTemplate from "../templates/password-reset.template.js";

class EmailService {

  /**
   * Prepara y simula el envío del correo de recuperación.
   * En un entorno real, usaría SendGrid, SES, etc.
   * @param {string} email - Correo del destinatario.
   * @param {string} token - Token de reseteo.
   * @returns {Promise<boolean>}
   */
  async sendResetPassword(email, token) {
    const html = resetTemplate(token);

    // Simulación de envío: Aquí integrarías SendGrid, SES, Nodemailer, etc.
    console.log("-----------------------------------------");
    console.log("📧 SIMULACIÓN: Enviando correo de reseteo a:", email);
    console.log("Asunto: Restablecimiento de Contraseña");
    console.log("Contenido HTML (URL de reseteo):");
    console.log(html);
    console.log("-----------------------------------------");

    return true;
  }
}
export default new EmailService();