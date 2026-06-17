
## Objetivo

Acercar NOVU a una experiencia tipo Calendly:

1. Renombrar **Sesión 1:1 → Servicio** en toda la UI.
2. Cada **servicio** tiene su propia disponibilidad (no una sola global).
3. La página **Reservas** muestra un **calendario** con tus agendamientos NOVU + eventos de tu Google Calendar superpuestos.

---

## 1. Rebrand "Sesión 1:1" → "Servicios"

Solo cambios de UI/copy, sin migrar nombres de tablas (`one_on_one_sessions`, `session_bookings`) para no romper edge functions ni RLS.

Archivos a editar:
- `src/components/creator/NewProductDialog.tsx` — opción "Sesión 1:1" → "Servicio"
- `src/components/layout/CreatorSidebar.tsx` — items "Sesiones 1:1" / "Reservas" → "Servicios" / "Reservas"
- `src/pages/creator/CreatorProductsPage.tsx` — etiquetas y badges
- `src/pages/creator/SessionEditorPage.tsx` → renombrar visualmente a "Editor de servicio"
- `src/pages/SessionBookingPage.tsx` → "Reserva tu servicio con ..."
- `src/pages/creator/CreatorBookingsPage.tsx` → "Reservas de servicios"
- `src/pages/SessionBookingSuccessPage.tsx`

Rutas internas (`/booking`, `/creator-app/bookings`, `/creator-app/sessions`) se mantienen; opcionalmente añadimos alias `/creator-app/services` que monte el mismo componente (rutas viejas siguen funcionando).

---

## 2. Disponibilidad por servicio

Hoy la disponibilidad vive en `creator_availability_settings` + `creator_availability_rules` (una sola por creador). La movemos a nivel de servicio.

### Cambios de schema (migración)

Agregar columnas a `one_on_one_sessions`:
- `timezone text default 'America/Santiago'`
- `buffer_before_min int default 0`
- `buffer_after_min int default 0`
- `min_notice_hours int default 12`
- `max_days_ahead int default 30`

Nueva tabla `session_availability_rules`:
- `session_id uuid` → `one_on_one_sessions(id)` on delete cascade
- `day_of_week smallint (0-6)`, `start_time time`, `end_time time`
- RLS: el creador del servicio gestiona; lectura pública si el servicio está `published`
- GRANTs: `select` para `anon` + `authenticated`, `all` para creador, `all` para `service_role`

**Fallback**: si un servicio no tiene reglas propias, hereda las globales del creador (para no romper servicios existentes). En cuanto el creador edita las reglas del servicio, se usan las del servicio.

Las tablas globales (`creator_availability_settings`, `creator_availability_rules`) se mantienen como **defaults** que se copian al crear un nuevo servicio. La página "Disponibilidad" del sidebar pasa a ser "Disponibilidad por defecto" (opcional: la ocultamos del menú, accesible desde un link en el editor).

### Cambios en `calendar-availability` edge function

Leer reglas y settings primero desde el servicio; si no hay, caer al creador. Mantener la sustracción de bookings NOVU + Google FreeBusy.

### Cambios en `SessionEditorPage`

Agregar pestaña / sección **"Disponibilidad"** dentro del editor: zona horaria, buffers, anticipación, ventana, y bloques semanales (mismo UI que `CreatorAvailabilityPage` pero scoped al `session_id`). Botón "Copiar desde mis defaults".

---

## 3. Vista calendario en Reservas

Renovar `CreatorBookingsPage` para mostrar:
- Toggle **Lista | Calendario** (mes/semana).
- En modo calendario: eventos NOVU (verdes, clickeables → detalle) + eventos de Google Calendar (grises, read-only) del rango visible.
- Filtros: por servicio, por estado.

### Nuevo edge function `creator-calendar-events`
- Auth requerido (creator).
- Input: `from`, `to` ISO.
- Output: `{ novu_bookings: [...], google_events: [...] }` donde `google_events` viene de `calendar/v3/calendars/{id}/events?timeMin&timeMax&singleEvents=true` usando el token OAuth guardado.
- Si el creador no tiene Google conectado, devuelve `google_events: []`.

### Librería de calendario
Usar `react-big-calendar` (ya familiar, ligero, con vistas mes/semana/día). Instalar `react-big-calendar` y `date-fns` (date-fns ya existe).

### UI
- Header: selector de vista (Mes/Semana/Día), navegación, botón "Hoy".
- Eventos NOVU → modal con detalle (asistente, servicio, link Meet, botón Cancelar).
- Eventos Google → tooltip con título + hora (sin acciones, son externos).
- Leyenda de colores.

---

## 4. Orden de implementación

```text
1. Migración: columnas en one_on_one_sessions + tabla session_availability_rules
2. Edge function calendar-availability: leer per-service con fallback global
3. Edge function creator-calendar-events (nuevo)
4. SessionEditorPage: sección Disponibilidad por servicio
5. CreatorBookingsPage: vista calendario con react-big-calendar
6. Rebrand UI Sesión 1:1 → Servicio (último, solo strings)
```

---

## Fuera de alcance (siguiente build)

- Pagos MercadoPago en servicios (sigue gratis por ahora).
- Notificaciones por email al asistente/creador.
- Edición/movimiento de eventos vía drag-and-drop en el calendario.
- Sincronizar eventos NOVU existentes de la tabla `events`.
- Recordatorios y reprogramación.
