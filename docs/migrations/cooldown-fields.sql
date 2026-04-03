ALTER TABLE whatsapp_conversations
ADD COLUMN IF NOT EXISTS off_topic_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cooldown_until timestamptz DEFAULT NULL;
