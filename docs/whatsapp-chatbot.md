# Chatbot WhatsApp — Documentación técnica

## Descripción general

El bloque "Chatbot WhatsApp" agrega un asistente de IA (Claude) que atiende mensajes entrantes de WhatsApp y permite a los clientes agendar, consultar y cancelar turnos de forma conversacional, sin intervención humana.

## Arquitectura

```
Cliente WhatsApp
      |
      v
Evolution API (instancia: negocio_{id})
      |
      v  (webhook POST)
/api/Whatsapp/webhook/route.ts
      |
      v
lib/whatsapp-bot.ts  ←→  Anthropic Claude (tool use)
      |                         |
      |              ┌──────────┴──────────┐
      |           Tools:              Supabase DB
      |         - listar_servicios    - whatsapp_conversations
      |         - listar_profesionales - turnos
      |         - consultar_disponibilidad
      |         - crear_turno
      |         - cancelar_turno
      |         - consultar_mi_turno
      |
      v
sendWhatsAppNotification()  →  Evolution API  →  Cliente WhatsApp
```

## Archivos del sistema

| Archivo | Descripción |
|---------|-------------|
| `types/whatsapp-bot.ts` | Tipos TypeScript del dominio |
| `lib/whatsapp-bot.ts` | Motor principal del bot |
| `app/api/Whatsapp/webhook/route.ts` | Receptor de webhooks de Evolution API |
| `app/api/Whatsapp/setup-chatbot/route.ts` | Activar/desactivar chatbot + registro de webhook |
| `blocks/chatbot/admin/ChatbotAdmin.tsx` | Panel de administración en el dashboard |
| `docs/migrations/whatsapp-chatbot.sql` | Migración SQL de la tabla `whatsapp_conversations` |

## Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=         # URL pública de Supabase
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (no exponer al cliente)
ANTHROPIC_API_KEY=                # API key de Anthropic
EVOLUTION_API_URL=                # URL base de Evolution API (sin slash final)
EVOLUTION_API_KEY=                # API key de Evolution API
NEXT_PUBLIC_APP_URL=              # URL pública de la app (para el webhook URL)
```

## Flujo de una conversación

1. Cliente envía mensaje al número de WhatsApp del negocio.
2. Evolution API llama al webhook `POST /api/Whatsapp/webhook`.
3. El webhook extrae el `negocio_id` del nombre de instancia (`negocio_{id}`).
4. `handleWhatsAppMessage` carga o crea la conversación en `whatsapp_conversations`.
5. Se construye el system prompt con los servicios y equipo del negocio.
6. Claude procesa el mensaje con acceso a 6 tools.
7. Si Claude llama tools, se ejecutan y los resultados se devuelven (loop de hasta 5 iteraciones).
8. La respuesta final se envía al cliente via `sendWhatsAppNotification`.

## Gestión de conversaciones

- Ventana activa: 2 horas desde el último mensaje.
- Si el cliente escribe después de 2 horas, se crea una conversación nueva (contexto limpio).
- Se mantienen máximo 20 mensajes por conversación (rolling window).
- Las conversaciones con más de 24 horas se pueden limpiar con `cleanup_old_wa_conversations()`.

## Deduplicación de mensajes

Evolution API puede enviar el mismo webhook más de una vez. El sistema deduplica por `message.id` usando un `Map` en memoria con TTL de 60 segundos.

## Activar el chatbot

Desde el panel de administración del bloque, el dueño del negocio puede activar/desactivar el chatbot con un toggle. Al activar:

1. Se llama a `POST /api/Whatsapp/setup-chatbot` con `{ negocioId, enabled: true }`.
2. La API registra el webhook en Evolution API para la instancia del negocio.
3. Se actualiza `config_web.chatbot.enabled = true` en la tabla `negocios`.

Al desactivar, el webhook se desregistra y el bot deja de responder.

## Seguridad

- El webhook no requiere autenticación (Evolution API no envía API key por defecto). La seguridad recae en el secreto de la URL y en la validación de que la instancia corresponde a un negocio existente con el bloque activo.
- El endpoint `/api/Whatsapp/setup-chatbot` requiere sesión autenticada y verifica que el usuario sea dueño del negocio.
- Todas las queries a Supabase usan el service role key server-side; nunca se expone al cliente.
- Los números de teléfono se muestran enmascarados en el panel de admin (`344****78`).

## Migración de base de datos

Ejecutar el archivo `docs/migrations/whatsapp-chatbot.sql` en Supabase SQL Editor antes de activar el bloque en producción.

## Configuración de limpieza periódica

Agregar al cron job existente del proyecto la llamada a la función de limpieza:

```sql
SELECT cleanup_old_wa_conversations();
```

O desde la API de cron del proyecto si ya existe un endpoint para ello.
