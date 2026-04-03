import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { count, error } = await supabase
      .from('negocios')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.log('[KEEP-ALIVE] Error:', error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }

    console.log('[KEEP-ALIVE] OK -', count, 'negocios activos');
    return NextResponse.json({ status: 'ok', negocios: count, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.log('[KEEP-ALIVE] Error:', err.message);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
