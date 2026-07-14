
## Diagnóstico

En el código ya existe la infraestructura para conectar Google Calendar (tabla `creator_google_accounts`, funciones `google-oauth-start/callback`, `getValidAccessToken`, `calendar-availability` con freeBusy y `booking-create` que crea el evento con Meet). Que estés viendo horas ocupadas como disponibles y que las reservas no aparezcan en tu Google Calendar apunta a **dos causas** que voy a atacar juntas:

1. **Tu cuenta de Google no está conectada** (o está conectada pero solo se consulta el calendario `primary`). Cuando no hay fila en `creator_google_accounts` para tu `creator_id`, `getValidAccessToken` devuelve `null`, entonces:
   - `calendar-availability` no llama a `freeBusy` → los bloqueos no se restan.
   - `booking-create` no crea el evento en Google → no aparece en tu calendario.
2. **Solo se revisa el calendario `primary`.** Si tienes bloqueos en un calendario secundario (ej: "Personal", trabajo), esos eventos no se restan porque no se incluyen en `freeBusy.items`.

Además, el formulario de reserva solo pide **nombre y email**, falta **teléfono**.

## Cambios

### 1. Pedir teléfono en la reserva (frontend + backend)
- `src/pages/SessionBookingPage.tsx`: agregar campo "Teléfono" (opcional o requerido, ver preguntas) junto a nombre y email; enviarlo al edge function.
- `supabase/functions/booking-create/index.ts`: aceptar `guest_phone`, guardarlo en `session_bookings.guest_phone` e incluirlo en la descripción del evento de Google Calendar y en el correo transaccional al creador.
- Migración: agregar columna `guest_phone TEXT` a `session_bookings`.
- Para usuarios logueados, precargar el teléfono si existe en `profiles` (si el campo existe) o pedirlo igualmente.

### 2. FreeBusy sobre TODOS los calendarios del creador
- `supabase/functions/calendar-availability/index.ts`: antes de llamar a `/freeBusy`, listar `GET /calendar/v3/users/me/calendarList` y armar `items` con todos los calendarios donde `selected !== false` y `accessRole` sea `owner/writer/reader`. Así los bloqueos de calendarios secundarios también invalidan slots.
- Añadir logging del resultado para depurar (número de calendarios, cantidad de `busy` recibidos).

### 3. Detectar cuenta no conectada y avisar
- En `SessionEditorPage` y `CreatorBookingsPage`: mostrar banner de advertencia grande cuando `useGoogleConnection()` no tenga conexión, con botón directo "Conectar Google Calendar" que abre `/creator-app/integrations`.
- En `CreatorIntegrationsPage`: agregar botón "Probar conexión" que llama a un nuevo endpoint `google-test` que consulta `calendarList` y muestra los calendarios detectados. Sirve para verificar que la conexión funciona y que sí se leen tus bloqueos.

### 4. Que el evento aparezca en tu calendario aunque el usuario no acepte
- En `booking-create`: el evento ya se crea en el calendario del creador (`tok.row.calendar_id`), así que aparecerá siempre. Verificar que `sendUpdates=all` y que se registre en logs el `htmlLink` del evento devuelto por Google para poder depurar.
- Guardar `google_html_link` en `session_bookings` para poder linkearlo desde la vista del creador.

### 5. Migración
```sql
ALTER TABLE public.session_bookings
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS google_html_link TEXT;
```

## Detalles técnicos

- FreeBusy admite hasta 50 calendarios por request; filtrar por `selected: true` cubre el 99% de los casos.
- El evento se crea con `attendees: [{ email }]` — si el email es de un dominio Workspace distinto, Google puede rechazar invitaciones; en ese caso el evento igual queda en tu calendario del creador.
- No se toca la lógica de pagos, ni el flujo de OAuth existente, ni las URLs de redirect.

## Preguntas antes de implementar

1. ¿Quieres que el **teléfono sea obligatorio** o solo opcional?
2. ¿Prefieres que la lista de calendarios a considerar para freeBusy sea **automática** (todos los `selected`) o quieres una UI donde tú elijas manualmente cuáles bloquean tus horarios?
