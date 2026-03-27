-- migrations/whatsapp-chatbot.sql
-- Tabla de conversaciones de WhatsApp para el bloque Chatbot.
-- Cada fila representa una sesión de conversación (ventana de 2 horas por defecto).

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id integer NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  messages jsonb DEFAULT '[]'::jsonb,
  booking_draft jsonb DEFAULT '{}'::jsonb,
  stage text DEFAULT 'idle',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice compuesto para lookups eficientes por negocio + teléfono (conversación activa)
CREATE INDEX IF NOT EXISTS idx_wa_conv_negocio_phone_updated
  ON whatsapp_conversations (negocio_id, phone_number, updated_at DESC);

-- Índice para la limpieza periódica por timestamp
CREATE INDEX IF NOT EXISTS idx_wa_conv_updated
  ON whatsapp_conversations (updated_at);

-- Trigger para actualizar updated_at automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION update_wa_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wa_conversation_updated ON whatsapp_conversations;
CREATE TRIGGER trg_wa_conversation_updated
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_wa_conversation_timestamp();

-- RLS: solo el service role puede leer/escribir (el bot usa service role key)
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON whatsapp_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- Función de limpieza de conversaciones viejas (llamar via cron diario)
-- Retorna la cantidad de filas eliminadas para logging.
CREATE OR REPLACE FUNCTION cleanup_old_wa_conversations()
RETURNS integer AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM whatsapp_conversations WHERE updated_at < now() - interval '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
