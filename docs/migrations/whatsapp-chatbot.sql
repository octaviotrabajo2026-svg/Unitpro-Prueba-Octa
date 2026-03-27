-- Migration: whatsapp-chatbot
-- Tabla de conversaciones WhatsApp para el chatbot de UnitPro.
-- Ejecutar en Supabase SQL Editor o via CLI.

-- Tabla principal de conversaciones
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id    TEXT        NOT NULL,
  phone         TEXT        NOT NULL,
  messages      JSONB       NOT NULL DEFAULT '[]',
  booking_draft JSONB       NOT NULL DEFAULT '{}',
  stage         TEXT        NOT NULL DEFAULT 'greeting',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_negocio  ON whatsapp_conversations(negocio_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_phone    ON whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conv_activity ON whatsapp_conversations(last_activity DESC);

-- Trigger: actualiza last_activity automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_whatsapp_conv_updated_at ON whatsapp_conversations;
CREATE TRIGGER trg_whatsapp_conv_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversation_updated_at();

-- RLS: habilitar Row Level Security
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: service role tiene acceso total (usado por el bot en el servidor)
CREATE POLICY "service_role_all" ON whatsapp_conversations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: usuarios autenticados pueden leer las conversaciones de sus propios negocios
CREATE POLICY IF NOT EXISTS "authenticated_select_own" ON whatsapp_conversations
  FOR SELECT TO authenticated
  USING (
    negocio_id::text IN (
      SELECT id::text FROM negocios WHERE user_id = auth.uid()
    )
  );

-- Función de limpieza: elimina conversaciones con más de 30 días de inactividad
-- Ejecutar periódicamente via pg_cron o Supabase Edge Functions
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM whatsapp_conversations
  WHERE last_activity < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
