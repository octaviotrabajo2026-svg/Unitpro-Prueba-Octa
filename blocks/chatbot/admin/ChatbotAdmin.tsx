"use client";

// blocks/chatbot/admin/ChatbotAdmin.tsx
// Panel de administración del bloque Chatbot WhatsApp.
// Permite activar/desactivar el bot y ver estadísticas de conversaciones recientes.

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { BlockAdminProps } from '@/types/blocks';
import {
  Bot,
  MessageCircle,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Circle,
} from 'lucide-react';

interface ConversationRow {
  id: string;
  phone_number: string;
  messages: any[];
  stage: string;
  updated_at: string;
}

interface Stats {
  conversationsToday: number;
  conversationsTotal: number;
  avgMessages: number;
  bookingsCreated: number;
}

const STAGE_LABELS: Record<string, string> = {
  idle: 'Inicio',
  choosing_service: 'Eligiendo servicio',
  choosing_worker: 'Eligiendo profesional',
  choosing_date: 'Eligiendo fecha',
  choosing_time: 'Eligiendo horario',
  collecting_name: 'Nombre del cliente',
  collecting_email: 'Email del cliente',
  confirming: 'Confirmando turno',
  completed: 'Completado',
  cancelling: 'Cancelando',
};

/** Enmascara un número de teléfono para mostrar en el panel sin exponer datos del cliente */
function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 6) return '***';
  return `${clean.slice(0, 3)}****${clean.slice(-2)}`;
}

/** Retorna una descripción legible del tiempo transcurrido desde una fecha */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function ChatbotAdmin({ negocio, config }: BlockAdminProps) {
  const [enabled, setEnabled] = useState<boolean>(
    (config as any)?.chatbot?.enabled ?? false
  );
  const [toggling, setToggling] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    conversationsToday: 0,
    conversationsTotal: 0,
    avgMessages: 0,
    bookingsCreated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [negocio.id]);

  /** Carga estadísticas y conversaciones recientes de las últimas 24 horas */
  async function loadData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: convs } = await supabase
        .from('whatsapp_conversations')
        .select('id, phone_number, messages, stage, updated_at')
        .eq('negocio_id', negocio.id)
        .gte('updated_at', oneDayAgo)
        .order('updated_at', { ascending: false })
        .limit(20);

      const { count: totalCount } = await supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('negocio_id', negocio.id);

      const rows = convs ?? [];
      const avgMsgs =
        rows.length > 0
          ? Math.round(
              rows.reduce(
                (acc: number, c: ConversationRow) => acc + (c.messages?.length ?? 0),
                0
              ) / rows.length
            )
          : 0;

      const { count: bookingsCount } = await supabase
        .from('whatsapp_conversations')
        .select('id', { count: 'exact', head: true })
        .eq('negocio_id', negocio.id)
        .eq('stage', 'completed');

      setConversations(rows);
      setStats({
        conversationsToday: rows.length,
        conversationsTotal: totalCount ?? 0,
        avgMessages: avgMsgs,
        bookingsCreated: bookingsCount ?? 0,
      });
    } catch (err) {
      console.error('[ChatbotAdmin] Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }

  /** Activa o desactiva el chatbot via API, registrando/desregistrando el webhook */
  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetch('/api/Whatsapp/setup-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ negocioId: negocio.id, enabled: !enabled }),
      });
      if (res.ok) setEnabled(!enabled);
    } catch (err) {
      console.error('[ChatbotAdmin] Error al cambiar estado:', err);
    } finally {
      setToggling(false);
    }
  }

  const hasWhatsApp = !!negocio.whatsapp_access_token;

  return (
    <div className="space-y-6 p-4">
      {/* Header con toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <Bot className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chatbot WhatsApp</h2>
            <p className="text-sm text-gray-500">Asistente IA para agendar turnos</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling || !hasWhatsApp}
          aria-label={enabled ? 'Desactivar chatbot' : 'Activar chatbot'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-green-500' : 'bg-gray-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Banner de estado */}
      {enabled ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">
            El chatbot está activo y respondiendo mensajes de WhatsApp.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600">
            El chatbot está desactivado. Activalo para empezar a responder automáticamente.
          </p>
        </div>
      )}

      {/* Advertencia si WhatsApp no está conectado */}
      {!hasWhatsApp && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Necesitás conectar WhatsApp primero. Hacelo desde la sección de configuración.
          </p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: 'Hoy',
            value: loading ? '—' : stats.conversationsToday,
            icon: MessageCircle,
          },
          {
            label: 'Total histórico',
            value: loading ? '—' : stats.conversationsTotal,
            icon: TrendingUp,
          },
          {
            label: 'Mensajes promedio',
            value: loading ? '—' : stats.avgMessages,
            icon: MessageCircle,
          },
          {
            label: 'Turnos agendados',
            value: loading ? '—' : stats.bookingsCreated,
            icon: Calendar,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-3 bg-white border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Descripción de funcionalidades */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
        <p className="text-sm font-medium text-blue-800">¿Qué hace el chatbot?</p>
        <ul className="space-y-1.5 text-sm text-blue-700">
          {[
            'Muestra los servicios y precios disponibles',
            'Ayuda a elegir profesional y horario',
            'Crea el turno directamente en el calendario',
            'Responde consultas sobre el próximo turno',
            'Permite cancelar turnos desde WhatsApp',
          ].map((feat) => (
            <li key={feat} className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">✓</span>
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* Lista de conversaciones recientes */}
      {conversations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Conversaciones recientes (24h)
          </h3>
          <div className="space-y-2">
            {conversations.map((conv) => {
              const lastMsg = conv.messages?.[conv.messages.length - 1];
              return (
                <div
                  key={conv.id}
                  className="p-3 bg-white border border-gray-100 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {maskPhone(conv.phone_number)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {STAGE_LABELS[conv.stage] ?? conv.stage}
                      </span>
                      <span className="text-xs text-gray-400">
                        {timeAgo(conv.updated_at)}
                      </span>
                    </div>
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-gray-500 truncate">
                      {lastMsg.role === 'assistant' ? '🤖 ' : '👤 '}
                      {lastMsg.content.slice(0, 80)}
                      {lastMsg.content.length > 80 ? '…' : ''}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
