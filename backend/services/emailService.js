/**
 * @file emailService.js
 * @description Servicio para envío de correos electrónicos transaccionales (códigos MFA / 2FA).
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Inicializa y retorna el transportador de correo.
 * Soporta configuración real SMTP (Gmail, Outlook, Brevo, etc.)
 * y genera una cuenta de prueba Ethereal en desarrollo si no hay credenciales configuradas.
 */
const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (user && pass) {
    // Configuración SMTP Real provista en .env
    transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
    console.log(`[Email Service] Configurado SMTP real con usuario: ${user}`);
  } else {
    // Modo Desarrollo / Pruebas: Usar Ethereal Test Account
    console.log('[Email Service] No se detectaron credenciales SMTP en .env. Creando transportador de prueba...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Email Service] Cuenta de prueba Ethereal inicializada (${testAccount.user})`);
    } catch (err) {
      console.warn('[Email Service] No se pudo crear cuenta de prueba Ethereal, usando transportador json:', err.message);
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return transporter;
};

/**
 * Envía el código de verificación MFA por correo al usuario.
 * @param {Object} options
 * @param {string} options.to - Correo del destinatario
 * @param {string} [options.name] - Nombre del usuario
 * @param {string} options.code - Código numérico de 6 dígitos
 * @returns {Promise<{success: boolean, previewUrl?: string, error?: string}>}
 */
const sendMfaEmail = async ({ to, name, code }) => {
  try {
    const activeTransporter = await getTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || '"AutoServicio San Jorge" <seguridad@autoserviciosanjorge.com>';
    const userName = name || 'Estimado usuario';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333333; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0; font-size: 14px; color: #93c5fd; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
          .instructions { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
          .code-box { background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
          .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 8px; }
          .code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 36px; font-weight: 800; color: #1d4ed8; letter-spacing: 8px; margin: 0; }
          .expiry { font-size: 13px; color: #dc2626; margin-top: 10px; font-weight: 500; }
          .security-note { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #1e40af; line-height: 1.5; margin-top: 24px; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>San Jorge</h1>
            <p>Portal de Autoservicio y Seguridad</p>
          </div>
          <div class="content">
            <div class="greeting">Hola, ${userName} 👋</div>
            <p class="instructions">
              Se ha solicitado un inicio de sesión en tu cuenta. Para confirmar que eres tú y continuar de forma segura, ingresa el siguiente código de verificación de dos pasos (MFA):
            </p>
            
            <div class="code-box">
              <div class="code-label">Tu código de confirmación</div>
              <div class="code">${code}</div>
              <div class="expiry">⏱️ Válido durante los próximos 5 minutos</div>
            </div>

            <div class="security-note">
              <strong>Aviso de seguridad:</strong> Si tú no solicitaste este código, puedes ignorar este correo. Ningún miembro de nuestro equipo te pedirá este código.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} AutoServicio San Jorge. Más de 30 años de experiencia.<br>
            Este es un correo automático de seguridad, por favor no respondas a esta dirección.
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: fromAddress,
      to,
      subject: `🔐 ${code} es tu código de verificación - AutoServicio San Jorge`,
      text: `Hola ${userName},\n\nTu código de verificación de dos factores (MFA) para AutoServicio San Jorge es:\n\n${code}\n\nEste código expira en 5 minutos.\n\nSi no fuiste tú, ignora este correo.`,
      html: htmlContent,
    };

    const info = await activeTransporter.sendMail(mailOptions);
    let previewUrl = null;

    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Email MFA Enviado] Vista previa del correo para ${to}: ${previewUrl}`);
      }
    }

    console.log(`[Email MFA Enviado] Código enviado exitosamente a ${to} (MessageId: ${info.messageId || 'json'})`);
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`[Email Service Error] No se pudo enviar el correo a ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendMfaEmail,
};
