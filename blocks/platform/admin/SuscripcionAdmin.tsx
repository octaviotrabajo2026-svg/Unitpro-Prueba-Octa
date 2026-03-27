"use client";
// blocks/platform/admin/SuscripcionAdmin.tsx
import { useState, useEffect } from "react";
import { Coins, ArrowUpRight, ArrowDownLeft, Package, TrendingUp, Lock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { getBalance, getTransactionHistory, type Transaction } from "@/lib/unitcoins";
import { UCoin } from "@/components/ui/UnitCoin";
import { BLOCK_PRICES } from "@/blocks/_registry-data";
import type { BlockAdminProps, BlockId } from "@/types/blocks";

const PACKS = [
  { uc: 50, usd: 5, label: 'Starter' },
  { uc: 200, usd: 15, label: 'Pro', popular: true },
  { uc: 1000, usd: 50, label: 'Business' },
] as const;

export default function SuscripcionAdmin({ negocio }: BlockAdminProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeBlockIds, setActiveBlockIds] = useState<BlockId[]>([]);
  const [billingFree, setBillingFree] = useState(true);
  useEffect(() => {
    const supabase = createClient();
    supabase.from('platform_config').select('value').eq('key','billing_enforced').maybeSingle()
      .then(({ data }) => {
        const cfg = (data?.value as any) || { negocio_ids: [], agency_ids: [] };
        setBillingFree(!cfg.negocio_ids?.includes(negocio.id));
      });
  }, [negocio.id]);

  useEffect(() => {
    getBalance(negocio.id).then(setBalance);
  }, [negocio.id]);

  useEffect(() => {
    getTransactionHistory(negocio.id, 10).then(setTransactions);
  }, [negocio.id]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('tenant_blocks')
      .select('block_id')
      .eq('negocio_id', negocio.id)
      .eq('active', true)
      .then(({ data }) => {
        if (data) setActiveBlockIds(data.map((b: { block_id: string }) => b.block_id as BlockId));
      });
  }, [negocio.id]);

  // Suma del costo mensual estimado según bloques activos con priceUC > 0
  const monthlyTotalUC = activeBlockIds.reduce((total, id) => {
    return total + (BLOCK_PRICES[id]?.priceUC ?? 0);
  }, 0);

  return (
    <div className="animate-in fade-in space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">UnitCoins</h1>
        <p className="text-zinc-500 text-sm">Tu moneda interna para activar y usar funcionalidades.</p>
      </header>
      {billingFree && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <Check size={14} /> Cuenta en modo libre — los bloques se activan sin costo de UnitCoins.
        </div>
      )}

      {/* 1. Balance card */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">Balance actual</p>
            <div className="flex items-center gap-3">
              <UCoin amount={balance} size="lg" />
              <span className="text-4xl font-black text-zinc-900">{balance}</span>
              <span className="text-lg text-zinc-400 font-medium">UC</span>
            </div>
          </div>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#577a2c15' }}
          >
            <Coins size={32} style={{ color: '#577a2c' }} />
          </div>
        </div>
        {monthlyTotalUC > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2">
            <TrendingUp size={14} className="text-zinc-400" />
            <span className="text-sm text-zinc-500">
              Consumo mensual estimado:{' '}
              <strong className="text-zinc-900">{monthlyTotalUC} UC</strong>
              {balance > 0 && monthlyTotalUC > 0 && (
                <span className="text-zinc-400 ml-1">
                  ({Math.floor(balance / monthlyTotalUC)} mes
                  {Math.floor(balance / monthlyTotalUC) !== 1 ? 'es' : ''} de saldo)
                </span>
              )}
            </span>
          </div>
        )}
      </section>

      {/* 2. Recharge packs */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
          <Package size={18} style={{ color: '#577a2c' }} /> Recargar UnitCoins
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {PACKS.map(pack => (
            <div
              key={pack.uc}
              className={`relative rounded-xl border p-4 text-center ${
                'popular' in pack && pack.popular
                  ? 'border-[#577a2c] bg-[#577a2c]/5'
                  : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              {'popular' in pack && pack.popular && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: '#577a2c' }}
                >
                  Popular
                </span>
              )}
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{pack.label}</p>
              <p className="text-2xl font-black text-zinc-900 mb-0.5">{pack.uc} UC</p>
              <p className="text-sm text-zinc-500 mb-3">USD {pack.usd}</p>
              <button
                disabled
                className="w-full py-2 rounded-lg text-xs font-bold bg-zinc-200 text-zinc-400 cursor-not-allowed flex items-center justify-center gap-1"
              >
                <Lock size={12} /> Proximamente
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Active blocks */}
      {activeBlockIds.length > 0 && (
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h2 className="font-bold text-zinc-900 mb-4">Bloques activos</h2>
          <div className="space-y-2">
            {activeBlockIds
              .filter(id => (BLOCK_PRICES[id]?.priceUC ?? 0) > 0)
              .map(id => {
                const def = BLOCK_PRICES[id];
                if (!def) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                  >
                    <span className="text-sm text-zinc-700">{def.name}</span>
                    <span className="text-sm font-bold text-zinc-900">{def.priceUC} UC/mes</span>
                  </div>
                );
              })}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
              <span className="text-sm font-bold text-zinc-900">Total mensual</span>
              <span className="text-base font-black" style={{ color: '#577a2c' }}>
                {monthlyTotalUC} UC/mes
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Transaction history */}
      <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="font-bold text-zinc-900 mb-4">Ultimas transacciones</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">No hay transacciones aun.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-zinc-400 uppercase border-b border-zinc-100">
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Descripcion</th>
                  <th className="pb-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-zinc-50 last:border-0">
                    <td className="py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 text-zinc-700 flex items-center gap-1.5">
                      {tx.amount > 0 ? (
                        <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <ArrowDownLeft size={14} className="text-red-400 shrink-0" />
                      )}
                      {tx.description ?? tx.type}
                    </td>
                    <td
                      className={`py-2.5 text-right font-bold ${
                        tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount} UC
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
