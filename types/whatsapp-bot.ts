// types/whatsapp-bot.ts
// Tipos para el sistema de chatbot de WhatsApp.

export interface WhatsappConversation {
  id: string;
  negocio_id: number;
  phone_number: string;
  messages: ConversationMessage[];
  booking_draft: BookingDraft;
  stage: ConversationStage;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BookingDraft {
  service?: string;
  serviceName?: string;
  servicePrice?: number;
  serviceDuration?: number;
  workerId?: string;
  workerName?: string;
  date?: string;        // YYYY-MM-DD
  time?: string;        // HH:mm
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export type ConversationStage =
  | 'idle'
  | 'choosing_service'
  | 'choosing_worker'
  | 'choosing_date'
  | 'choosing_time'
  | 'collecting_name'
  | 'collecting_email'
  | 'confirming'
  | 'completed'
  | 'cancelling';

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessageData;
}

export interface EvolutionMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text: string };
  };
  messageType?: string;
  messageTimestamp?: number;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
