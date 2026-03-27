'use client';
// blocks/chatbot/admin/ChatbotAdmin.tsx
// Panel de administración del Chatbot WhatsApp.
// Muestra stats, toggle de activación y conversaciones recientes (últimas 24hs).

import { useState, useEffect } from 'react';
import { Bot, MessageCircle, TrendingUp, Users } from 'lucide-react';
import type { BlockAdminProps } from '@/types/blocks';
import { createClient } from '@/lib/supabase';

interface ConversationPreview {
  id: string;
  phone: string;
  messages: Array<{ role: string; content: string }>;
  last_activity: string;
}

interface Stats {
  today: number;
  total: number;
  avgMessages: number;
}

export default function ChatbotAdmin({ negocio }: BlockAdminProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, total: 0, avgMessages: 0 });

  // Leer estado inicial desde config_web
  useEffect(() => {
    const configWeb = negocio.config_web || {};
    setEnabled(configWeb.chatbot?.enabled || false);
    loadConversations();
  }, [negocio.id]);

  /** Carga conversaciones recientes y calcula stats desde Supabase. */
  async function loadConversations() {
    const supabase = createClient();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: recent }, { data: allConvs }] = await Promise.all([
      supabase
        .from('whatsapp_conversations')
        .select('id, phone, messages, last_activity')
        .eq('negocio_id', negocio.id)
        .gte('last_activity', yesterday)
        .order('last_activity', { ascending: false })
        .limit(20),
      supabase
        .from('whatsapp_conversations')
        .select('id, messages')
        .eq('negocio_id', negocio.id),
    ]);

    if (recent) setConversations(recent);

    if (allConvs) {
      const total = allConvs.length;
      const today = recent?.length || 0;
      const avgMessages =
        total > 0
          ? Math.round(
              allConvs.reduce((sum, c) => sum + (c.messages?.length || 0), 0) / total
            )
          : 0;
      setStats({ today, total, avgMessages });
    }
  }

  /** Activa o desactiva el chatbot llamando al endpoint setup-chatbot. */
  async function handleToggle() {
    setLoading(true);
    try {
      const configWeb = negocio.config_web || {};
      const instanceName =
        configWeb.chatbot?.instanceName || `negocio_${negocio.id}`;

      const res = await fetch('/api/whatsapp/setup-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: negocio.id,
          enabled: !enabled,
          instanceName,
        }),
      });

      if (res.ok) {
        setEnabled(!enabled);
      }
    } catch (e) {
      console.error('[CHATBOT-ADMIN] Error toggling chatbot:', e);
    } finally {
      setLoading(false);
    }
  }

  const configWeb = negocio.config_web || {};
  const hasWhatsApp = !!(
    configWeb.contacto?.whatsapp || configWeb.chatbot?.instanceName
  );

  return (
    <div className="space-y-6">
      {/* Header con toggle */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Bot size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Chatbot WhatsApp</h2>
            <p className="text-sm text-zinc-500">
              Asistente IA para agendar turnos automáticamente
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading || !hasWhatsApp}
          aria-label={enabled ? 'Desactivar chatbot' : 'Activar chatbot'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-zinc-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Warning si no hay WhatsApp configurado */}
      {!hasWhatsApp && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-amber-500 text-lg" aria-hidden="true">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-800">
              WhatsApp no configurado
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Necesitás configurar una instancia de WhatsApp para activar el chatbot.
            </p>
          </div>
        </div>
      )}

      {/* Banner de estado activo/inactivo */}
      <div
        className={`p-4 rounded-xl border ${
          enabled
            ? 'bg-green-50 border-green-200'
            : 'bg-zinc-50 border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              enabled ? 'bg-green-500' : 'bg-zinc-400'
            }`}
          />
          <span
            className={`text-sm font-medium ${
              enabled ? 'text-green-800' : 'text-zinc-600'
            }`}
          >
            {enabled ? 'Bot activo — respondiendo mensajes' : 'Bot inactivo'}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-zinc-200 text-center">
          <div className="flex justify-center mb-1">
            <MessageCircle size={16} className="text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.today}</p>
          <p className="text-xs text-zinc-500 mt-1">Hoy</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-zinc-200 text-center">
          <div className="flex justify-center mb-1">
            <Users size={16} className="text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
          <p className="text-xs text-zinc-500 mt-1">Total</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-zinc-200 text-center">
          <div className="flex justify-center mb-1">
            <TrendingUp size={16} className="text-zinc-400" />
          </div>
          <p className="text-2xl font-bold text-zinc-900">{stats.avgMessages}</p>
          <p className="text-xs text-zinc-500 mt-1">Msgs promedio</p>
        </div>
      </div>

      {/* Conversaciones recientes (últimas 24hs) */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">
          Conversaciones recientes (24hs)
        </h3>
        {conversations.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
            <MessageCircle size={36} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-sm text-zinc-400">No hay conversaciones recientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const lastMsg = conv.messages?.[conv.messages.length - 1];
              const timeAgo = new Date(conv.last_activity).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={conv.id}
                  className="p-3 bg-white rounded-lg border border-zinc-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-800">
                      {conv.phone}
                    </span>
                    <span className="text-xs text-zinc-400">{timeAgo}</span>
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-zinc-500 truncate">
                      {lastMsg.role === 'user' ? '👤 ' : '🤖 '}
                      {lastMsg.content}
                    </p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1">
                    {conv.messages?.length || 0} mensajes
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
