-- ============================================================
-- RLS POLICIES — UnitPro
-- Fecha: 2026-04-07
-- ============================================================
-- Contexto:
--   - El bot de WhatsApp usa supabaseAdmin (service role key) → BYPASEA RLS.
--   - Superadmin usa service role → BYPASEA RLS.
--   - Los server actions que usan supabaseAdmin (agency-actions, delete-negocio, etc.) → BYPASEA RLS.
--   - Lo que SÍ pasa por RLS: frontend (dashboard, páginas públicas) con anon key.
--
-- Modelo de datos relevante:
--   negocios.user_id       → uuid del dueño directo del negocio (auth.users)
--   negocios.agency_id     → FK a agencies.id (null si es autogestionado)
--   negocios.is_agency_site→ bool (landing de la agencia misma)
--   agencies.user_id       → uuid del usuario de la agencia (auth.users)
--   tenant_blocks.negocio_id → FK a negocios.id
--   whatsapp_conversations.negocio_id → FK a negocios.id
-- ============================================================


-- ============================================================
-- 1. TABLA: negocios
-- ============================================================

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;

-- ── SELECT: cualquiera puede leer ────────────────────────────────────────────
-- Justificación: los datos de negocios (nombre, servicios, horarios, config_web)
-- son públicos — se muestran en las páginas web de cada negocio sin autenticación.
-- Las server actions que hacen .eq('slug', slug) sin auth REQUIEREN esto.
CREATE POLICY "negocios_select_public"
  ON negocios
  FOR SELECT
  USING (true);

-- ── INSERT: agencia puede crear negocios para sus clientes ───────────────────
-- Caso de uso: ClientCreateModal.tsx — la agencia (autenticada) crea un negocio
-- nuevo con agency_id = su agencia y user_id = el nuevo usuario recién registrado.
-- También cubre el caso de negocios autogestionados que se registran solos.
CREATE POLICY "negocios_insert_owner"
  ON negocios
  FOR INSERT
  WITH CHECK (
    -- Caso 1: negocio autogestionado — el usuario se inserta a sí mismo
    user_id = auth.uid()
    OR
    -- Caso 2: agencia crea negocio para un cliente
    (
      agency_id IS NOT NULL
      AND auth.uid() IN (
        SELECT user_id FROM agencies WHERE id = agency_id
      )
    )
  );

-- ── UPDATE: dueño directo O agencia responsable ──────────────────────────────
-- Caso de uso A: ConfirmBookingDashboard / ServiceBookingDashboard — el negocio
--   logueado actualiza su propio registro (.eq('id', negocio.id)).
-- Caso de uso B: DashboardAgencia — la agencia actualiza datos de sus clientes
--   (.update({ editor_enabled }).eq('id', id)).
CREATE POLICY "negocios_update_owner"
  ON negocios
  FOR UPDATE
  USING (
    -- Camino 1: el usuario ES el dueño directo del negocio
    auth.uid() = user_id
    OR
    -- Camino 2: el usuario es la agencia que gestiona este negocio
    (
      agency_id IS NOT NULL
      AND auth.uid() IN (
        SELECT user_id FROM agencies WHERE id = agency_id
      )
    )
  );

-- ── DELETE: bloqueado desde el frontend ──────────────────────────────────────
-- Todos los DELETE en el código usan supabaseAdmin (service role), que bypasea RLS.
-- No se crea policy de DELETE — ningún usuario anon puede borrar negocios.


-- ============================================================
-- 2. TABLA: tenant_blocks
-- ============================================================

ALTER TABLE tenant_blocks ENABLE ROW LEVEL SECURITY;

-- ── SELECT: cualquiera puede leer ────────────────────────────────────────────
-- Justificación: las páginas públicas (lib/blocks.server.ts → getActiveBlockIds)
-- leen qué bloques están activos para renderizar la web del negocio, sin auth.
-- El bot también usa service role, así que no depende de esto.
CREATE POLICY "tenant_blocks_select_public"
  ON tenant_blocks
  FOR SELECT
  USING (true);

-- ── INSERT: dueño del negocio o su agencia ───────────────────────────────────
-- Caso de uso: lib/blocks.ts (activateBlock, activateBlocksBatch) y
-- ClientCreateModal (inserta bloques iniciales al crear un negocio).
CREATE POLICY "tenant_blocks_insert_owner"
  ON tenant_blocks
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      -- Dueño directo del negocio
      SELECT n.user_id
        FROM negocios n
       WHERE n.id = negocio_id
         AND n.user_id IS NOT NULL
      UNION
      -- Usuario de la agencia que gestiona ese negocio
      SELECT a.user_id
        FROM negocios n
        JOIN agencies a ON a.id = n.agency_id
       WHERE n.id = negocio_id
    )
  );

-- ── UPDATE: dueño del negocio o su agencia ───────────────────────────────────
-- Caso de uso: lib/blocks.ts (deactivateBlock → update active=false,
-- updateBlockConfig → update config).
CREATE POLICY "tenant_blocks_update_owner"
  ON tenant_blocks
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT n.user_id
        FROM negocios n
       WHERE n.id = negocio_id
         AND n.user_id IS NOT NULL
      UNION
      SELECT a.user_id
        FROM negocios n
        JOIN agencies a ON a.id = n.agency_id
       WHERE n.id = negocio_id
    )
  );

-- ── DELETE: bloqueado desde el frontend ──────────────────────────────────────
-- delete-negocio.ts usa service role (bypasea RLS).
-- No se crea policy de DELETE.


-- ============================================================
-- 3. TABLA: whatsapp_conversations
-- ============================================================

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

-- ── SELECT: solo el dueño del negocio o su agencia ───────────────────────────
-- Caso de uso: ChatbotAdmin.tsx — el negocio autenticado lee sus conversaciones.
-- El bot usa supabaseAdmin (bypasea RLS) para INSERT/UPDATE.
CREATE POLICY "whatsapp_conversations_select_owner"
  ON whatsapp_conversations
  FOR SELECT
  USING (
    negocio_id IN (
      -- Dueño directo
      SELECT id FROM negocios WHERE user_id = auth.uid()
      UNION
      -- Agencia que gestiona el negocio
      SELECT n.id
        FROM negocios n
        JOIN agencies a ON a.id = n.agency_id
       WHERE a.user_id = auth.uid()
    )
  );

-- ── INSERT / UPDATE / DELETE: bloqueado desde el frontend ────────────────────
-- Todo el acceso de escritura va por supabaseAdmin (bot y server actions).
-- No se crean policies de escritura.


-- ============================================================
-- 4. TABLA: agencies
-- ============================================================
-- NOTA: verificar si agencies ya tiene RLS habilitado en el dashboard de Supabase.
-- Si NO tiene RLS, agregar estas policies.

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- ── SELECT: cualquiera puede leer ────────────────────────────────────────────
-- DashboardAgencia lee agencies por slug sin auth previa (.eq('slug', params.slug))
-- useWhitelabel.ts también lee agencies sin garantía de sesión.
CREATE POLICY "agencies_select_public"
  ON agencies
  FOR SELECT
  USING (true);

-- ── UPDATE: solo la propia agencia puede editarse ────────────────────────────
-- AgencySettingsModal.tsx hace .update().eq('id', agency.id) con browser client.
-- agency-actions.ts usa supabaseAdmin, así que no necesita esta policy.
CREATE POLICY "agencies_update_owner"
  ON agencies
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ── INSERT / DELETE: bloqueado desde el frontend ─────────────────────────────
-- El registro de agencias no ocurre por browser client (o si ocurre, agregar policy).


-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================
-- Correr estas queries en el SQL Editor de Supabase para confirmar:
--
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   AND tablename IN ('negocios', 'tenant_blocks', 'whatsapp_conversations', 'agencies');
--
-- SELECT schemaname, tablename, policyname, cmd, qual
--   FROM pg_policies
--   WHERE tablename IN ('negocios', 'tenant_blocks', 'whatsapp_conversations', 'agencies')
--   ORDER BY tablename, cmd;
