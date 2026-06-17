# Sistema de emails para eventos online

3 correos transaccionales, todos enviados con Lovable Emails y branding NOVU (amarillo #fcc70e, Inter, GraduationCap).

## 1. Email de confirmación de inscripción

**Cuándo**: inmediatamente cuando se crea un `event_registrations` (gatillado desde `mercadopago-webhook` tras pago exitoso, o desde el flujo gratuito si el evento es $0).

**Tono**: "Quedaste inscrito" — confirma el registro, NO la asistencia.

**Contenido**:
- "Hola {nombre}, tu lugar está reservado 🎉"
- Datos del evento: título, creador, fecha (formato es-CL con día de semana), hora local Chile, duración.
- Mensaje claro: *"Esto confirma tu inscripción. Te enviaremos un recordatorio antes del evento con el link de acceso."*
- CTA principal: "Ver en Mis Eventos" → `/app/mis-cursos?tab=events`.
- Opcional: agregar al calendario (link `.ics` generado dinámicamente o link a Google Calendar).
- Footer NOVU.

**Idempotency key**: `event-confirmation-{registration_id}`.

## 2. Email de recordatorio (configurable por el creador)

**Cuándo**: el creador define cuánto tiempo antes quiere que se envíe, al crear/editar el evento.

**Configuración por evento** (nuevos campos en `events`):
- `reminder_enabled` (boolean, default `true`).
- `reminder_minutes_before` (int, default `60`). UI: select con presets **15 min / 30 min / 1 hora / 2 horas / 6 horas / 12 horas / 24 horas** + opción "No enviar recordatorio".

**Tono**: "Tu evento empieza pronto" — incluye el link de acceso.

**Contenido**:
- "Tu evento '{título}' empieza en {X} {minutos|horas}"
- Fecha y hora exacta.
- **Botón grande**: "Unirme a la sala" → `meeting_url` (resuelto server-side desde `events.meeting_url`, solo se incluye en este email a inscritos activos).
- Tip corto: "Te recomendamos entrar 5 minutos antes."
- Footer NOVU.

**Idempotency key**: `event-reminder-{registration_id}` (uno por inscrito, no se reenvía).

## 3. Email de evaluación post-evento

**Cuándo**: ~30 min después de que termina el evento (calculado con `event_date + duration_minutes + 30min`).

**Tono**: agradecer + pedir feedback corto al creador.

**Contenido**:
- "Gracias por participar en '{título}'"
- "¿Cómo estuvo? Tu opinión ayuda a {nombre del creador} a mejorar."
- CTA principal: "Dejar evaluación" → `/{creator_slug}#reviews` (página pública del creador, donde ya existe el form de review).
- Footer NOVU.

**Idempotency key**: `event-feedback-{registration_id}`.

---

## Cómo se programan los envíos (recordatorio + feedback)

Nueva edge function **`process-event-emails`**, agendada con `pg_cron` cada 5 minutos. En cada tick:

1. **Recordatorios**: busca `event_registrations` activos cuyo evento cumple:
   `reminder_enabled = true`
   `event_date - reminder_minutes_before` cae dentro de los últimos 5 min y aún no se encoló el email (chequeo en `email_send_log` por `idempotencyKey`).
2. **Feedback**: busca `event_registrations` activos cuyo `event_date + duration_minutes + 30 min` cae dentro de los últimos 5 min.
3. Para cada match, invoca `send-transactional-email` con la plantilla correspondiente. La idempotencyKey evita duplicados aunque el cron se solape.

Confirmación NO usa el cron — se envía sincrónicamente al crear el registro.

---

## Cambios técnicos

### Base de datos (migración)
- `ALTER TABLE events ADD COLUMN reminder_enabled boolean DEFAULT true`
- `ALTER TABLE events ADD COLUMN reminder_minutes_before int DEFAULT 60`
- Habilitar extensiones `pg_cron` y `pg_net` (si no están).
- Crear cron job que llama a `process-event-emails` cada 5 min.

### Plantillas React Email (en `supabase/functions/_shared/transactional-email-templates/`)
- `event-confirmation.tsx`
- `event-reminder.tsx`
- `event-feedback.tsx`
- Actualizar `registry.ts`.

### Edge functions
- **Modificar `mercadopago-webhook`**: al hacer upsert en `event_registrations`, invocar `send-transactional-email` con `event-confirmation`.
- **Nueva `process-event-emails`**: cron worker descrito arriba (usa service role, lee `events` + `event_registrations` + `profiles`).
- Prerequisito: scaffold de Lovable Emails (`setup_email_infra` + `scaffold_transactional_email`) si aún no está.

### Frontend
- **`EventEditorPage.tsx`**: nueva sección "Recordatorio por email" con switch `reminder_enabled` + select `reminder_minutes_before` (15m, 30m, 1h, 2h, 6h, 12h, 24h).
- **`MyCoursesPage.tsx` (pestaña Eventos)**: agregar botón "Unirme a la sala" que llama a la RPC `get_event_meeting_url` (sólo visible si el evento empieza en < 24h o ya está en curso). Esto da consistencia con el link del recordatorio.

---

## Fuera de alcance (lo confirmo antes de implementar)
- Email al creador con resumen post-evento.
- Recordatorios múltiples (ej. 24h + 1h). Por ahora sólo 1 recordatorio configurable; si después lo necesitas, se agrega un segundo campo `reminder_minutes_before_2`.
- Adjuntar archivo `.ics` (los emails de Lovable no soportan adjuntos; usamos link a Google Calendar en su lugar).
- Re-envío manual desde el panel del creador.
