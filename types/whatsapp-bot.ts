// types/whatsapp-bot.ts

export type ConversationStage =
  | 'greeting'
  | 'selecting_service'
  | 'selecting_professional'
  | 'selecting_date'
  | 'selecting_time'
  | 'collecting_info'
  | 'confirming'
  | 'completed'
  | 'cancelling';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface BookingDraft {
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  serviceDuration?: number;
  workerId?: string;
  workerName?: string;
  date?: string;  // YYYY-MM-DD
  time?: string;  // HH:mm
  start?: string; // ISO
  end?: string;   // ISO
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export interface WhatsappConversation {
  id: string;
  negocio_id: string;
  phone: string;
  messages: ConversationMessage[];
  booking_draft: BookingDraft;
  stage: ConversationStage;
  last_activity: string;
  created_at: string;
}

export interface EvolutionMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  messageType: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessageData;
}
