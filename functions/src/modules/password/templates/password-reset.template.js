// modules/password/templates/password-reset.template.js

/**
 * Genera el cuerpo HTML para el correo de recuperación de contraseña.
 * @param {string} token - El token único de reseteo.
 * @returns {string} HTML del correo.
 */
export default function resetTemplate(token) {
  // Asegúrate de que process.env.FRONTEND_URL esté configurado en las Firebase Functions.
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const url = `${frontendUrl}/reset-password?token=${token}`;

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #333;">Recuperación de Contraseña</h2>
      <p>Has solicitado restablecer la contraseña de tu cuenta en nuestra plataforma.</p>
      <p>Haz clic en el botón de abajo para continuar:</p>
      <a 
        href="${url}" 
        style="
          display: inline-block; 
          padding: 10px 20px; 
          margin: 15px 0;
          background-color: #007bff; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          font-weight: bold;
        "
      >
        Restablecer Contraseña
      </a>
      <p style="font-size: 0.9em; color: #666;">
        Si no solicitaste este cambio, por favor ignora este correo. 
        Este enlace expirará en 15 minutos.
      </p>
      <p style="font-size: 0.8em; color: #999;">
        URL: ${url}
      </p>
    </div>
  `;
}