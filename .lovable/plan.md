# Build 2 — Sesiones 1:1 (sin pagos, gratuitas)

Implementa sesiones 1:1 que el creador ofrece desde su perfil. El comprador elige fecha/hora dentro de la disponibilidad semanal del creador, se valida contra Google Calendar (freebusy) y se crea un evento con Google Meet en ambos calendarios (el del creador por OAuth; el del comprador vía link "Add to Google Calendar" + archivo `.ics`).

Pagos quedan fuera de este build (se agregan en Build 3).

## Qué construir

### 1. Disponibilidad del creador
- Página **Creator → Disponibilidad** (`/creator-app/availability`).
- Editor de horario semanal recurrente: para cada día (Lun–Dom), N bloques `HH:MM–HH:MM` en la timezone del creador.
- Campos globales: `timezone` (default `America/Santiago`), `session_duration_min` (15/30/45/60/90), `buffer_min` antes/después, `min_notice_hours` (anticipación mínima), `max_days_ahead` (ventana visible para reservar).

### 2. Producto "Sesión 1:1"
- Nuevo tipo en `NewProductDialog`: **Sesión 1:1**.
- Página de edición **Creator → Sesión 1:1 Editor**: título, descripción (rich text con DOMPurify), duración, portada, estado (draft/published).
- Aparece en el perfil público del creador y en su marketplace junto a cursos/ebooks/eventos.
- Sin precio en este build (etiqueta "Gratis").

### 3. Página pública de booking
- Ruta: `/c/:creatorSlug/sesion/:sessionId`.
- Calendario que muestra los próximos `max_days_ahead` días.
- Al elegir día → lista de slots disponibles (genera slots a partir del horario recurrente, resta los del rango `freebusy` del creador en Google Calendar, respeta `buffer`, `min_notice`, y reservas ya existentes en NOVU).
- Si el visitante no tiene cuenta → captura email/nombre (guest, como ya hace MercadoPago checkout).
- Confirmación → crea reserva, crea evento en Google Calendar del creador con Meet, envía al comprador la página de éxito con link Meet, link "Add to Google Calendar" y descarga `.ics`.

### 4. Sincronización Google Calendar (lado creador)
- Al confirmar reserva: `events.insert` en `calendar_id='primary'` con `conferenceData` para generar Meet automáticamente, invita al email del comprador como attendee.
- Al cancelar reserva: `events.delete`.
- Bloqueo automático: si el creador tiene otro evento en Calendar en ese slot, no aparece como disponible (vía `freebusy.query`).

### 5. Página del comprador "Mi reserva"
- Si el comprador tiene cuenta NOVU, ver reserva en **Mis Productos** con link Meet, "Add to Google Calendar" (URL universal `https://calendar.google.com/calendar/render?action=TEMPLATE&...`), descarga `.ics`, y botón cancelar (con `min_notice` configurable).
- Guest: misma info en la página de éxito + email de confirmación con los mismos links.

---

## Detalles técnicos

### Tablas nuevas (migración única, todas con GRANTs + RLS)

**`creator_availability_settings`** (1 fila por creador)
- `creator_id` PK FK → auth.users
- `timezone` text default `America/Santiago`
- `session_duration_min` int default 30
- `buffer_before_min`, `buffer_after_min` int default 0
- `min_notice_hours` int default 12
- `max_days_ahead` int default 30
- `created_at`, `updated_at`

**`creator_availability_rules`** (bloques recurrentes semanales)
- `id`, `creator_id` FK, `day_of_week` smallint 0–6, `start_time` time, `end_time` time
- Índice por `(creator_id, day_of_week)`

**`one_on_one_sessions`** (producto)
- `id`, `creator_id`, `title`, `description`, `cover_url`, `duration_min`, `status` ('draft'|'published'), `created_at`, `updated_at`
- Hereda patrón de `events` / `ebooks`.

**`session_bookings`** (reserva)
- `id`, `session_id` FK, `creator_id`, `user_id` nullable, `guest_email`, `guest_name`
- `start_at` timestamptz, `end_at` timestamptz, `status` ('confirmed'|'cancelled')
- `google_event_id` text, `meet_url` text
- `created_at`, `cancelled_at`
- Constraint: no doble booking confirmado en el mismo slot del mismo creador (índice único parcial).

RLS:
- Settings/rules: solo el creador dueño puede leer/escribir.
- `one_on_one_sessions`: SELECT público para `status='published'`; INSERT/UPDATE/DELETE solo el creador.
- `session_bookings`: el creador ve sus reservas; el `user_id` ve las suyas; `service_role` para edge functions.

RPCs:
- `get_public_session(creator_slug, session_id)` → datos públicos del producto.
- `get_my_session_bookings()` → reservas del usuario logueado.
- `get_creator_session_bookings()` → reservas del creador (próximas/pasadas).

### Edge functions nuevas

- **`calendar-availability`** (POST, público): input `{ session_id, from_date, to_date }`. Genera slots desde las reglas semanales, llama Google `freebusy.query` con el `access_token` del creador (usando `getValidAccessToken` ya existente), resta bookings de NOVU, devuelve slots libres.
- **`booking-create`** (POST): input `{ session_id, start_at, guest_email?, guest_name? }`. Verifica que el slot siga libre, crea row en `session_bookings`, llama Google `events.insert` con `conferenceData.createRequest` para Meet, guarda `google_event_id` y `meet_url`. Devuelve booking + links (.ics generado on-the-fly, URL Add-to-Calendar).
- **`booking-cancel`** (POST): valida ownership (user o creador), llama `events.delete`, marca `cancelled`.
- **`booking-ics`** (GET, público con token firmado): devuelve el `.ics` para descargar.

### Frontend

Nuevos archivos:
- `src/pages/creator/CreatorAvailabilityPage.tsx` — editor semanal + settings.
- `src/pages/creator/SessionEditorPage.tsx` — CRUD del producto.
- `src/pages/creator/CreatorBookingsPage.tsx` — listado de reservas próximas/pasadas con link Meet.
- `src/pages/SessionBookingPage.tsx` — página pública de booking (calendario + slots + confirm).
- `src/pages/SessionBookingSuccessPage.tsx` — confirmación con links.
- `src/components/booking/WeeklyScheduleEditor.tsx`, `SlotPicker.tsx`, `AddToCalendarButtons.tsx`.
- `src/hooks/useAvailability.ts`, `useBooking.ts`.
- `src/lib/ics.ts` — helper para construir el archivo .ics y la URL universal de Google Calendar.

Cambios:
- `CreatorSidebar.tsx`: agregar "Disponibilidad" y "Reservas".
- `NewProductDialog.tsx`: agregar tipo "Sesión 1:1".
- `CreatorProductsPage.tsx`: listar sesiones 1:1.
- `CreatorProfilePage.tsx` / marketplace: mostrar sesiones publicadas.
- `MyCoursesPage.tsx` o nueva tab en "Mis Productos": mostrar bookings del usuario.
- `App.tsx`: registrar rutas.

### Flujo de bloqueo bidireccional

- **NOVU → Calendar**: la reserva crea evento en Calendar del creador → cualquier otro tool que consulte su Calendar lo ve ocupado.
- **Calendar → NOVU**: `calendar-availability` llama `freebusy.query` en tiempo real al pintar slots, por lo que cualquier evento manual del creador en Google Calendar bloquea automáticamente (no requiere webhooks ni sync push en este build).

### Fuera de alcance (Build 3 / posterior)
- Pagos MercadoPago en sesiones 1:1.
- Sincronización de eventos online ya existentes (`events` table) con Calendar.
- Reprogramación (solo cancelar + reservar nuevo por ahora).
- Recordatorios por email automáticos (Resend) — la confirmación inicial sí va.
- Webhooks push de Google Calendar (no necesarios mientras `freebusy` se consulte on-demand).

---

## Orden de implementación

1. Migración SQL (tablas + RLS + RPCs).
2. Edge functions: `calendar-availability`, `booking-create`, `booking-cancel`, `booking-ics`.
3. Frontend creador: Disponibilidad + Editor de Sesión 1:1 + listado en Productos + Reservas.
4. Frontend público: página de booking + success + integración en perfil de creador.
5. Frontend comprador: bookings en "Mis Productos" + cancelar.
6. QA end-to-end con tu cuenta ya conectada a Google.
