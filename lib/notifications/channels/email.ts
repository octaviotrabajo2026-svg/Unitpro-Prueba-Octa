// lib/notifications/channels/email.ts

import { google } from 'googleapis';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  refreshToken: string;
  accessToken?: string;
}

export interface SendEmailResult {
  sent: boolean;
  error?: string;
}

/**
 * Envía un email usando la API de Gmail con OAuth2.
 * Requiere que el negocio tenga conectada su cuenta de Google.
 */
export async function sendEmail({
  to,
  subject,
  html,
  refreshToken,
  accessToken,
}: SendEmailParams): Promise<SendEmailResult> {
  
  if (!refreshToken) {
    return { sent: false, error: 'No hay refresh token de Google configurado' };
  }

  if (!to) {
    return { sent: false, error: 'No hay destinatario de email' };
  }

  try {
    // Configurar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Codificar subject en UTF-8 para caracteres especiales
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    // Construir mensaje RFC 2822
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      html,
    ];

    const rawMessage = Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Enviar
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    console.log(`✅ [EMAIL ENVIADO] a ${to}`);
    return { sent: true };

  } catch (error: any) {
    console.error('❌ [ERROR EMAIL]:', error?.message || error);
    return { 
      sent: false, 
      error: error?.message || 'Error desconocido al enviar email' 
    };
  }
}

/**
 * Construye el HTML wrapper para emails con estilo consistente.
 */
export function wrapEmailHtml(body: string, bannerUrl?: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      ${bannerUrl ? `<img src="${bannerUrl}" style="width: 100%; border-radius: 8px; margin-bottom: 20px;" alt="Banner" />` : ''}
      <div style="color: #374151; line-height: 1.6; font-size: 15px;">
        ${body}
      </div>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        Mensaje automático • No responder a este correo
      </p>
    </div>
  `;
}