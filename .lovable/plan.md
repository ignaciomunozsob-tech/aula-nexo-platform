## 1. URL de redirección post-compra (todos los productos)

**Migración DB**: agregar columna `redirect_url text` (nullable) a `courses`, `ebooks`, `events`, `one_on_one_sessions`.

**Editores de creador** (`CourseEditorPage`, `EbookEditorPage`, `EventEditorPage`, `SessionEditorPage`): agregar un `Input` "URL de redirección post-compra (opcional)" junto al campo de precio, con placeholder `https://tusitio.com/gracias` y ayuda: "Después del pago, el comprador será redirigido aquí (por ejemplo, un grupo de WhatsApp o página de gracias)". Se guarda en el snapshot/mutation existente.

**Uso al finalizar la compra**:
- Pagados: en `mercadopago-webhook`, tras fulfill, guardar `redirect_url` del producto en `orders.metadata.redirect_url`. En `PaymentResultPage`, si el pedido está `paid` y `metadata.redirect_url` existe, mostrar botón "Continuar" y auto-redirigir tras 3s.
- Gratis (evento): al inscribirse, si el evento tiene `redirect_url`, redirigir directamente tras registrar.

## 2. Correo de confirmación de inscripción a eventos

**Nueva plantilla** `supabase/functions/_shared/transactional-email-templates/event-registration-confirmation.tsx` (registrada en `registry.ts`), con props: `attendeeName`, `eventTitle`, `eventDateFormatted`, `durationMin`, `eventType` (`online`/`in_person`), `meetingUrl`, `location`, `creatorName`, `redirectUrl?`. Renderiza bloques de fecha/hora/duración estilo tarjeta y un CTA:
- Online: botón "Unirme a la reunión" → `meetingUrl`
- Presencial: bloque con `location` + botón "Ver en Google Maps"

**Disparadores** (invocan `send-transactional-email` con `templateName: 'event-registration-confirmation'` y `idempotencyKey` = `evt-reg-{order_id|registration_id}`):

- **Pagados** — en `supabase/functions/mercadopago-webhook/index.ts` dentro del bloque `product_type === 'event'` (tras `fulfillOrder`): leer `events` completo (title, event_date, duration, event_type, location, meeting_url via admin) + `profiles.name` del creador, resolver email del asistente (`order.guest_email` o email de `auth.users` vía `user_id`) e invocar el envío.
- **Gratis** — nueva Edge Function `register-free-event` (o extender flujo actual):
  1. Validar evento `published` con `price_clp = 0` y cupo disponible.
  2. Insertar en `event_registrations` (admin client). Soportar invitado (email requerido si no hay sesión) reusando el patrón de `GuestCheckoutDialog`.
  3. Enviar el correo de confirmación.
  4. Responder `{ redirect_url }` para que el frontend redirija.
  
  En `EventDetailPage`, si `price_clp === 0`, el botón "Inscribirme" invoca esta función en lugar de `startCheckout` (misma UX de diálogo para invitados).

**Deploys**: `send-transactional-email` (nueva plantilla), `mercadopago-webhook`, `register-free-event`.

## Detalles técnicos

- Migración incluye `GRANT`s existentes ya vigentes; solo añade columnas nullable — no toca RLS.
- `redirect_url` se valida en frontend como URL http/https; se guarda `null` si vacío.
- El correo se envía siempre (pagado y gratis); dedupe por `idempotencyKey`.
- `meeting_url` se obtiene con service role en la Edge Function (columna restringida en cliente, pero el webhook/función server-side puede leerla).
- El correo respeta la marca NOVU (amarillo #fcc70e, Inter, fondo blanco) según templates existentes.

## Archivos

- `supabase/migrations/<ts>_add_redirect_url.sql` (nuevo)
- `supabase/functions/_shared/transactional-email-templates/event-registration-confirmation.tsx` (nuevo)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (editar)
- `supabase/functions/mercadopago-webhook/index.ts` (editar: guardar redirect_url en metadata + enviar correo evento)
- `supabase/functions/register-free-event/index.ts` (nuevo)
- `src/pages/creator/CourseEditorPage.tsx`, `EbookEditorPage.tsx`, `EventEditorPage.tsx`, `SessionEditorPage.tsx` (agregar campo)
- `src/pages/EventDetailPage.tsx` (rama gratis + invitado)
- `src/pages/PaymentResultPage.tsx` (redirección post-pago)
