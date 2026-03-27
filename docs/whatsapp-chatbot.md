# Chatbot WhatsApp — Documentación técnica

## Descripción

El Chatbot WhatsApp es un bloque de UnitPro que conecta una instancia de WhatsApp Business (vía Evolution API) con un agente IA basado en Claude. El bot puede:

- Listar servicios disponibles del negocio
- Listar profesionales por servicio
- Consultar disponibilidad de horarios en tiempo real (Google Calendar)
- Crear turnos/reservas con datos del cliente
- Consultar el próximo turno de un cliente
- Cancelar el próximo turno de un cliente

---

## Arquitectura

```
Usuario (WhatsApp)
    ↓ mensaje
Evolution API
    ↓ POST webhook
/api/whatsapp/webhook
    ↓
handleWhatsAppMessage() — lib/whatsapp-bot.ts
    ↓
Claude (claude-sonnet-4-20250514) con tool use
    ↓ tools
┌─────────────────────────────────────────┐
│ listar_servicios      → config_web      │
│ listar_profesionales  → config_web      │
│ consultar_disponibilidad → checkAvailability + generateTimeSlots │
│ crear_turno           → createAppointment                        │
│ cancelar_turno        → Supabase (tabla turnos)                  │
│ consultar_mi_turno    → Supabase (tabla turnos)                  │
└─────────────────────────────────────────┘
    ↓ respuesta final
sendWhatsApp() — lib/notifications/channels/whatsapp.ts
    ↓
Evolution API → Usuario (WhatsApp)
```

---

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Evolution API
EVOLUTION_API_URL=https://evolution.tudominio.com
EVOLUTION_API_KEY=tu-api-key

# URL pública de la app (para registrar el webhook)
NEXT_PUBLIC_APP_URL=https://app.unitpro.com
```

---

## Formato del instance name

Evolution API identifica cada instancia de WhatsApp con un nombre único. UnitPro espera el formato:

```
negocio_<negocio_id>
```

Ejemplos:
- `negocio_123` → negocio_id = "123"
- `negocio_abc-def` → negocio_id = "abc-def"

La función `resolveNegocioFromInstance(instanceName)` extrae el ID usando esta regex: `/^negocio_(.+)$/`

---

## Las 6 tools disponibles

| Tool | Descripción | Inputs requeridos |
|------|-------------|-------------------|
| `listar_servicios` | Lista servicios con precio y duración | — |
| `listar_profesionales` | Lista profesionales de un servicio | `servicio_nombre` |
| `consultar_disponibilidad` | Horarios disponibles en una fecha | `fecha`, `servicio_nombre`, `worker_id?` |
| `crear_turno` | Crea una reserva | `servicio_nombre`, `fecha`, `hora`, `cliente_nombre`, `cliente_apellido`, `cliente_telefono` |
| `cancelar_turno` | Cancela el próximo turno por teléfono | `telefono` |
| `consultar_mi_turno` | Consulta el próximo turno por teléfono | `telefono` |

---

## Tabla `whatsapp_conversations`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | PK generado automáticamente |
| `negocio_id` | TEXT | ID del negocio |
| `phone` | TEXT | Número de teléfono del usuario (sin @s.whatsapp.net) |
| `messages` | JSONB | Array de `ConversationMessage` (role, content, timestamp) |
| `booking_draft` | JSONB | Datos parciales del turno en construcción |
| `stage` | TEXT | Etapa de la conversación (greeting, selecting_service, etc.) |
| `last_activity` | TIMESTAMPTZ | Timestamp de la última actividad (actualizado por trigger) |
| `created_at` | TIMESTAMPTZ | Timestamp de creación |

### Sesiones

Las conversaciones tienen una ventana de sesión de 2 horas (`SESSION_DURATION_MS`). Si el usuario no envía mensajes en 2 horas, la próxima interacción inicia una conversación nueva.

---

## Cómo activar/desactivar el bot

### Desde el panel de administración

1. Ir al bloque "Chatbot WhatsApp" en el dashboard
2. Usar el toggle para activar/desactivar
3. El toggle llama a `POST /api/whatsapp/setup-chatbot`

### Via API

```bash
POST /api/whatsapp/setup-chatbot
Content-Type: application/json
Authorization: Cookie de sesión

{
  "negocioId": "123",
  "enabled": true,
  "instanceName": "negocio_123"
}
```

Al activar, se registra automáticamente el webhook en Evolution API apuntando a `/api/whatsapp/webhook`. Al desactivar, se limpia el webhook.

### Configuración en `config_web`

```json
{
  "chatbot": {
    "enabled": true,
    "instanceName": "negocio_123"
  }
}
```

---

## Flujo de conversación típico

```
Usuario: "Hola, quiero sacar un turno"
Bot: usa listar_servicios → "Tenemos: Corte ($1500, 30min), Color ($3000, 90min) 💇"

Usuario: "Quiero un corte"
Bot: usa listar_profesionales → "Podés elegir entre María o Juan"

Usuario: "Con María el viernes"
Bot: usa consultar_disponibilidad → "Viernes tenemos: 10:00, 10:30, 11:00..."

Usuario: "A las 10:30"
Bot: "¿Me das tu nombre completo y teléfono para confirmar?"

Usuario: "Sofía García, 1155555555"
Bot: usa crear_turno → "✅ Turno confirmado para Corte el 2026-04-04 a las 10:30. ¡Te esperamos, Sofía!"
```

---

## Limitaciones y consideraciones

### Dedup de mensajes
El webhook implementa dedup en memoria (Map con TTL de 60s). En entornos con múltiples instancias de Node.js (como Vercel), los duplicados entre instancias distintas no están garantizados. Si es crítico, implementar el dedup en Redis o en la base de datos.

### Historial de mensajes
El historial se limita a los últimos 20 mensajes (`MAX_MESSAGES`) para controlar el tamaño del contexto enviado a Claude.

### Iteraciones de tools
El loop de tool use tiene un máximo de 5 iteraciones (`MAX_ITERATIONS`). Si Claude necesita más rondas de tools, devuelve el estado actual.

### Limpieza automática
La función `cleanup_old_whatsapp_conversations()` elimina conversaciones con más de 30 días. Configurar un cron job en Supabase o via pg_cron para ejecutarla periódicamente.

### Google Calendar
La tool `cancelar_turno` intenta cancelar el evento en Google Calendar si existe. Si falla (token expirado, etc.), igual cancela el registro en Supabase y continúa.

### Mensajes no-texto
El webhook solo procesa mensajes de texto. Audios, imágenes y documentos reciben una respuesta automática pidiendo que escriban su consulta.
