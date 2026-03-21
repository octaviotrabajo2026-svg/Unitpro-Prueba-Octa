import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  
  // 1. Capturamos el código seguro y la ruta de destino final
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // 2. Canjeamos el código seguro por una sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 3. Todo salió bien, redirigimos a la pantalla de /recover-password/reset
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si el enlace expiró o hubo un error, lo mandamos de vuelta al login
  return NextResponse.redirect(`${origin}/login?message=El enlace de recuperación no es válido o ha expirado`)
}