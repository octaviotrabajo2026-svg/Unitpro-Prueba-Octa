// lib/unitcoins.ts
// Motor de UnitCoins — moneda interna de UnitPro.
//
// SQL para ejecutar manualmente en Supabase:
//
// CREATE TABLE IF NOT EXISTS unitcoins_balance (
//   negocio_id integer PRIMARY KEY REFERENCES negocios(id) ON DELETE CASCADE,
//   balance integer DEFAULT 0,
//   total_spent integer DEFAULT 0,
//   updated_at timestamptz DEFAULT now()
// );
//
// CREATE TABLE IF NOT EXISTS unitcoins_transactions (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   type text NOT NULL, -- 'purchase' | 'block_charge' | 'refund' | 'referral_reward' | 'ai_usage'
//   amount integer NOT NULL, -- positive = credit, negative = debit
//   description text,
//   metadata jsonb DEFAULT '{}',
//   created_at timestamptz DEFAULT now()
// );

import { createClient } from '@/lib/supabase';

export interface Transaction {
  id: string;
  negocio_id: number;
  type: 'purchase' | 'block_charge' | 'refund' | 'referral_reward' | 'ai_usage';
  amount: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Obtiene el balance actual de UnitCoins para un negocio.
 * Retorna 0 si no existe fila o si ocurre un error.
 */
export async function getBalance(negocioId: number): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('unitcoins_balance')
    .select('balance')
    .eq('negocio_id', negocioId)
    .maybeSingle();

  if (error) {
    console.error('[unitcoins] Error en getBalance:', error);
    return 0;
  }
  return data?.balance ?? 0;
}

/**
 * Acredita UnitCoins al balance de un negocio y registra la transacción.
 * Pasos: obtiene balance actual → upsert con nuevo total → insert transaction.
 * Retorna true si la operación fue exitosa.
 */
export async function addCoins(
  negocioId: number,
  amount: number,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  const supabase = createClient();

  const currentBalance = await getBalance(negocioId);

  const { error: upsertError } = await supabase
    .from('unitcoins_balance')
    .upsert(
      {
        negocio_id: negocioId,
        balance: currentBalance + amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'negocio_id' }
    );

  if (upsertError) {
    console.error('[unitcoins] Error en addCoins (upsert):', upsertError);
    return false;
  }

  const { error: txError } = await supabase.from('unitcoins_transactions').insert({
    negocio_id: negocioId,
    type: 'purchase',
    amount,
    description,
    metadata,
  });

  if (txError) {
    console.error('[unitcoins] Error en addCoins (transaction):', txError);
    return false;
  }

  return true;
}

/**
 * Debita UnitCoins del balance de un negocio y registra la transacción.
 * Verifica saldo suficiente antes de proceder.
 * El parámetro `amount` es positivo; se almacena como negativo en la transacción.
 * Retorna false si no hay saldo suficiente o si ocurre un error.
 */
export async function deductCoins(
  negocioId: number,
  amount: number,
  description: string,
  metadata: Record<string, unknown> = {}
): Promise<boolean> {
  const supabase = createClient();

  const enough = await hasEnoughCoins(negocioId, amount);
  if (!enough) {
    console.warn('[unitcoins] Saldo insuficiente para deductCoins:', { negocioId, amount });
    return false;
  }

  const currentBalance = await getBalance(negocioId);

  // Obtener total_spent actual para incrementarlo
  const { data: balanceRow } = await supabase
    .from('unitcoins_balance')
    .select('total_spent')
    .eq('negocio_id', negocioId)
    .maybeSingle();

  const currentTotalSpent = balanceRow?.total_spent ?? 0;

  const { error: upsertError } = await supabase
    .from('unitcoins_balance')
    .upsert(
      {
        negocio_id: negocioId,
        balance: currentBalance - amount,
        total_spent: currentTotalSpent + amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'negocio_id' }
    );

  if (upsertError) {
    console.error('[unitcoins] Error en deductCoins (upsert):', upsertError);
    return false;
  }

  const { error: txError } = await supabase.from('unitcoins_transactions').insert({
    negocio_id: negocioId,
    type: 'block_charge',
    amount: -amount,
    description,
    metadata,
  });

  if (txError) {
    console.error('[unitcoins] Error en deductCoins (transaction):', txError);
    return false;
  }

  return true;
}

/**
 * Retorna las últimas `limit` transacciones de un negocio, ordenadas por fecha descendente.
 * Retorna array vacío si no hay datos o si ocurre un error.
 */
export async function getTransactionHistory(
  negocioId: number,
  limit = 10
): Promise<Transaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('unitcoins_transactions')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[unitcoins] Error en getTransactionHistory:', error);
    return [];
  }
  return (data as Transaction[]) ?? [];
}

/**
 * Verifica si un negocio tiene saldo suficiente para cubrir `amount` UC.
 */
export async function hasEnoughCoins(negocioId: number, amount: number): Promise<boolean> {
  const balance = await getBalance(negocioId);
  return balance >= amount;
}
