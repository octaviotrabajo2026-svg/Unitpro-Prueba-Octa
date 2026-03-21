import { google } from 'googleapis'

/**
 * Crea un cliente autenticado de Google Calendar y Gmail.
 * Centraliza el setup OAuth2 que estaba duplicado en múltiples action files.
 */
export function createGoogleCalendarClient(refreshToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: refreshToken })

  return {
    calendar: google.calendar({ version: 'v3', auth }),
    gmail: google.gmail({ version: 'v1', auth }),
    auth,
  }
}

/**
 * Obtiene un access token válido a partir de un refresh token.
 * Útil para operaciones que usan fetch directo en lugar de googleapis.
 */
export async function getValidAccessToken(refreshToken: string): Promise<string> {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: refreshToken })
  const { token } = await auth.getAccessToken()
  if (!token) throw new Error('No se pudo obtener access token de Google')
  return token
}
