# Integración Google Calendar + Sesiones 1:1 con agendamiento

Sistema completo para que creadores ofrezcan sesiones 1:1 pagas con sincronización bidireccional a su Google Calendar, más "Add to Calendar" universal para compradores de cualquier producto con fecha (1:1 y eventos).

---

## Fase 0 — Credenciales Google (única vez, manual del usuario)

Hay que crear un **OAuth Client** en Google Cloud Console (no se puede automatizar). Pasos que tendrás que hacer:

1. Crear proyecto en Google Cloud Console.
2. Habilitar **Google Calendar API**.
3. Configurar **OAuth consent screen** (External, agregar dominios `lovable.app`, dominio custom de NOVU).
4. Scopes requeridos:
   - `https://www.googleapis.com/auth/calendar.events` (crear/editar eventos en su calendario)
   - `https://www.googleapis.com/auth/calendar.freebusy` (leer disponibilidad)
5. Crear **OAuth Client ID** tipo "Web application".
6. Authorized redirect URI: `https://<project>.supabase.co/functions/v1/google-oauth-callback`.
7. Pegar `client_id` y `client_secret` cuando los pida.

Secretos nuevos: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.

---

## Fase 1 — Conexión Google del creador (OAuth)

### Backend
- Tabla `creator_google_accounts`: `creator_id`, `google_email`, `access_token`, `refresh_token`, `expires_at`, `calendar_id` (default `'primary'`), `connected_at`. RLS: solo el dueño lee; service_role escribe.
- Edge function **`google-oauth-start`**: genera URL de Google con `state` firmado y `access_type=offline + prompt=consent` (clave para obtener refresh_token).
- Edge function **`google-oauth-callback`**: intercambia code por tokens, guarda en `creator_google_accounts`, redirige al panel.
- Edge function **`google-disconnect`**: revoca token en Google y borra fila.
- Helper interno **`google-token-refresh`** (módulo compartido en `_shared/google.ts`): si `expires_at < now()+60s`, llama a Google `oauth2/token` con refresh_token y actualiza la fila. Usado por todas las funciones que tocan Calendar.

### Frontend
- En `CreatorPlanPage` o nueva tab **"Integraciones"** dentro del panel creador: card "Google Calendar" con estado conectado/desconectado, email mostrado, botones "Conectar" / "Desconectar".

---

## Fase 2 — Disponibilidad recurrente del creador

### Backend
- Tabla `creator_availability_rules`: `creator_id`, `day_of_week` (0-6), `start_time` (`time`), `end_time` (`time`), `timezone` (default `'America/Santiago'`). RLS: dueño full, anon SELECT (para mostrar slots públicos).
- Tabla `creator_booking_settings`: `creator_id` (PK), `slot_duration_minutes` (15/30/45/60/90), `buffer_minutes_before`, `buffer_minutes_after`, `min_notice_hours` (default 24), `max_advance_days` (default 30), `timezone`.

### Frontend
- Nueva página `/creator-app/agenda` con:
  - Grid semanal Lun-Dom para marcar bloques disponibles (tipo Calendly).
  - Settings: duración default, buffers, antelación mínima, ventana de reserva.
  - Requiere Google conectado para activar (CTA si no).

---

## Fase 3 — Producto "Sesión 1:1"

Cuarto tipo de producto (`product_type='one_on_one'`), reutilizando toda la infra de pagos/órdenes/comisión.

### Backend (migración)
- Tabla `one_on_one_services`: `id`, `creator_id`, `title`, `description`, `slug`, `duration_minutes`, `price_clp`, `cover_image_url`, `status` (`draft`/`published`), `meeting_provider` (default `'google_meet'`), `instructions_pre_call`, `category_id`, `is_novu_official`, timestamps. RLS: dueño full, público lee `published`.
- Trigger `enforce_paid_publish_requires_mp` también aplica.
- Tabla `bookings`: `id`, `service_id`, `creator_id`, `customer_id`, `customer_email`, `customer_name`, `start_at` (`timestamptz`), `end_at`, `status` (`pending_payment`/`confirmed`/`cancelled`/`completed`), `order_id` (FK a `orders`), `google_event_id`, `google_meet_url`, `customer_notes`, `cancellation_reason`, timestamps. RLS: customer ve las suyas, creator ve las suyas, service_role full.
- Extender enum `product_type` en `orders` con `'one_on_one'`.
- Actualizar `enforce_course_publish_rules` para incluir 1:1 en los límites del plan (gratis: 2 productos publicados totales / creador: 10 / pro: ilimitado).

### Edge functions
- **`booking-availability`** (público): input `{ service_id, date }` → devuelve slots disponibles del día. Lógica:
  1. Lee `creator_availability_rules` del día.
  2. Genera slots de `slot_duration_minutes` con buffers.
  3. Filtra los pasados / fuera de `min_notice_hours` / fuera de `max_advance_days`.
  4. Llama a Google Calendar **freebusy** del creador para ese rango → elimina solapamientos.
  5. Elimina slots con `bookings.status='confirmed'` (doble seguro).
- **`booking-create`** (público, soporta guest): input `{ service_id, slot_start, customer_email, customer_name, notes }`. Reserva slot con `status='pending_payment'`, crea `order` y preferencia MercadoPago igual que cursos/eventos. TTL: si no se paga en 15 min, expira (cron).
- **`mercadopago-webhook`** (modificar): al recibir `paid` en orden de `product_type='one_on_one'`:
  1. Marca `booking.status='confirmed'`.
  2. Crea evento en Google Calendar del creador vía API con `conferenceData.createRequest` → genera link Google Meet automático.
  3. Guarda `google_event_id` y `google_meet_url` en `bookings`.
  4. Encola emails de confirmación al creador y al cliente (con link Meet + Add to Calendar).
- **`booking-cancel`**: cliente o creador cancela → borra evento Google + marca `cancelled` (política de reembolso fuera de alcance).
- **`expire-pending-bookings`** (cron 5min): libera reservas `pending_payment` con más de 15 min.

### Frontend
- **`/creator-app/one-on-one`**: lista, crear, editar (similar a EbookEditorPage).
- **`/{creator_slug}/sesion/{slug}`** público: descripción + selector de fecha (calendario) + slots disponibles del día → "Reservar" → checkout MercadoPago (login o guest).
- En **marketplace**: nuevo tab "Sesiones 1:1".
- En **"Mis Productos"** del alumno: nueva tab "Sesiones" con próximas reservas + botón "Unirme" (link Meet) + "Add to Calendar".
- En **panel creador**: tab "Reservas" con calendario/lista.

---

## Fase 4 — Sincronización con eventos online existentes

Cuando el creador con Google conectado **publica un `events`**, también crear el evento en su Google Calendar (con Meet si `event_type='online'` y no hay `meeting_url`).

- Modificar `EventEditorPage` o trigger: al publicar/editar/eliminar evento → llamar nueva edge function **`sync-event-to-google`** que crea/actualiza/borra el evento en Google.
- Guardar `google_event_id` y opcionalmente `google_meet_url` en `events`.
- Si el creador NO tiene Google conectado, se omite silenciosamente (no es bloqueante).

---

## Fase 5 — "Add to Calendar" universal para compradores

No requiere OAuth del cliente. Funciona para cualquier producto con fecha (eventos + sesiones 1:1).

### Implementación
- Utilidad `src/lib/addToCalendar.ts` con:
  - `buildGoogleCalendarUrl({ title, description, start, end, location })` → URL `https://calendar.google.com/calendar/render?action=TEMPLATE&...`
  - `buildIcsFile(...)` → string `.ics` válido (BEGIN:VCALENDAR...) descargable como blob.
- Componente `<AddToCalendarButton event={...} />` con dropdown: "Google Calendar" / "Apple/Outlook (.ics)".
- Integrado en:
  - Email de confirmación de inscripción (link `Add to Google Calendar`).
  - Email de confirmación de booking 1:1.
  - Tab "Eventos" y "Sesiones" en `MyCoursesPage`.
  - Página de éxito post-pago (`PaymentResultPage`).

---

## Resumen de archivos

**Nuevos**:
- Migración con tablas `creator_google_accounts`, `creator_availability_rules`, `creator_booking_settings`, `one_on_one_services`, `bookings` + extensiones.
- Edge functions: `google-oauth-start`, `google-oauth-callback`, `google-disconnect`, `booking-availability`, `booking-create`, `booking-cancel`, `sync-event-to-google`, `expire-pending-bookings` + helper `_shared/google.ts`.
- Frontend: `CreatorAgendaPage`, `CreatorOneOnOnePage`, `OneOnOneEditorPage`, `OneOnOneDetailPage`, `CreatorIntegrationsPage` (o tab), `AddToCalendarButton`, `lib/addToCalendar.ts`, hook `useGoogleConnection`.

**Modificados**:
- `mercadopago-webhook` (handler 1:1).
- `EventEditorPage` (sync Google).
- `CreatorSidebar` (links Agenda, 1:1, Integraciones).
- `MarketplaceView` (tab Sesiones).
- `MyCoursesPage` (tab Sesiones + Add to Calendar).
- `App.tsx` (rutas nuevas).
- `enforce_course_publish_rules` (cuenta 1:1 en límites).

---

## Fuera de alcance (para iterar después)
- OAuth del cliente para sincronización automática a su Google.
- Reagendamiento (solo cancelar+reservar de nuevo).
- Múltiples calendarios por creador (siempre `primary`).
- Recurrencia de sesiones (paquetes de 4 sesiones, etc.).
- Política de reembolso automático al cancelar.
- Pasarela alternativa Zoom (siempre Google Meet por ahora).
- Recordatorios de 1:1 (heredarán el sistema cuando configures el dominio de email).

---

## Orden de ejecución sugerido

Por el tamaño, sugiero implementar por fases en builds separados:
1. **Build 1**: Fase 0 (te pido credenciales) + Fase 1 (conexión OAuth + UI Integraciones).
2. **Build 2**: Fase 2 + Fase 3 (sesiones 1:1 completas).
3. **Build 3**: Fase 4 (sync eventos) + Fase 5 (Add to Calendar).

¿Procedo así o lo quieres todo en un solo build?
