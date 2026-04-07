ALTER TABLE whatsapp_conversations
ADD COLUMN IF NOT EXISTS client_name text DEFAULT NULL;
