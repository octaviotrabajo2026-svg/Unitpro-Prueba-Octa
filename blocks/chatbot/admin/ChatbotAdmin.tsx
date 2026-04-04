'use client';
// blocks/chatbot/admin/ChatbotAdmin.tsx
// Panel de administración del Chatbot WhatsApp.
// Muestra stats, toggle de activación y conversaciones recientes (últimas 24hs).

import { useState, useEffect, useRef } from 'react';
import { Bot, MessageCircle, TrendingUp, Users, X } from 'lucide-react';
import type { BlockAdminProps } from '@/types/blocks';
import { createClient } from '@/lib/supabase';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ConversationPreview {
  id: string;
  phone_number: string;
  messages: ConversationMessage[];
  updated_at: string;
  cooldown_until: string | null;
}

interface Stats {
  today: number;
  total: number;
  avgMessages: number;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone || 'Sin número';
  return phone.slice(0, 6) + '****' + phone.slice(-3);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChatViewer({
  conversation,
  onClose,
}: {
  conversation: ConversationPreview;
  onClose: () => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = conversation.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <p className="font-semibold text-zinc-900">
              {maskPhone(conversation.phone_number)}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {formatDateTime(conversation.updated_at)} · {messages.length} mensajes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${conversation.phone_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={14} />
              Abrir en WhatsApp
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-zinc-400">Sin mensajes registrados</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="flex flex-col">
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm'
                        : 'bg-green-100 border border-green-200 text-zinc-800 rounded-tr-sm'
                    }`}
                  >
                    {msg.content.split(/\*\*(.+?)\*\*/g).map((part, j) =>
                      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                    )}
                  </div>
                  {msg.timestamp && (
                    <span className={`text-[10px] text-zinc-400 mt-0.5 ${
                      msg.role === 'user' ? 'text-left' : 'text-right'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function ChatbotAdmin({ negocio }: BlockAdminProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, total: 0, avgMessages: 0 });
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreview | null>(null);

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
        .select('id, phone_number, messages, updated_at, cooldown_until')
        .eq('negocio_id', negocio.id)
        .gte('updated_at', yesterday)
        .order('updated_at', { ascending: false })
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

      const res = await fetch('/api/Whatsapp/setup-chatbot', {
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
      } else {
        const body = await res.text();
        console.error('[CHATBOT-ADMIN] Error del servidor:', res.status, body);
      }
    } catch (e) {
      console.error('[CHATBOT-ADMIN] Error toggling chatbot:', e);
    } finally {
      setLoading(false);
    }
  }

  const configWeb = negocio.config_web || {};
  const hasWhatsApp = !!(
    negocio.whatsapp_access_token || configWeb.contacto?.whatsapp || configWeb.chatbot?.instanceName
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
              const firstUserMsg = conv.messages?.find((m) => m.role === 'user');
              const timeAgo = new Date(conv.updated_at).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const hasCooldown =
                conv.cooldown_until && new Date(conv.cooldown_until) > new Date();
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="w-full text-left p-3 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-sm font-medium text-zinc-800">
                        {maskPhone(conv.phone_number)}
                      </span>
                      {hasCooldown && (
                        <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          En pausa
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400">{timeAgo}</span>
                  </div>
                  {firstUserMsg && (
                    <p className="text-xs text-zinc-500 truncate pl-5">
                      {firstUserMsg.content}
                    </p>
                  )}
                  <p className="text-xs text-zinc-400 mt-1 pl-5">
                    {conv.messages?.length || 0} mensajes
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Viewer Modal */}
      {selectedConversation && (
        <ChatViewer
          conversation={selectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </div>
  );
}
