
# Eventos con editor por pestañas + Checkout personalizado + Order bump

Alinear los eventos con la experiencia que ya tienen los cursos: editor con pestañas (incluida gestión de inscritos), páginas de pago personalizadas con order bump, y un flujo de compra donde el invitado deja sus datos y, si el creador configuró una página de checkout, pasa por ella (con opción de order bump) antes de MercadoPago.

## 1. Editor de eventos con pestañas

Refactorizar `src/pages/creator/EventEditorPage.tsx` para usar `Tabs` (mismo patrón que `CourseEditorPage.tsx`) con estas pestañas cuando `isEditing`:

- **General**: título, descripción (RichText), categoría, precio, URL de redirección, portada.
- **Detalles del evento**: fecha, hora, duración, cupo, tipo (online/presencial), meeting URL / ubicación.
- **Inscritos**: renderiza `<StudentManagement productId={id} productType="event" />` (ya soporta `event`) para ver y agregar asistentes manualmente.
- **Página de pago**: reutiliza `<CheckoutPagesPage />` filtrado a este evento — permite crear/editar la página de checkout personalizada asociada. Se pasa un `productFilter={{ type: 'event', id }}` para pre-seleccionar el producto y mostrar solo las páginas de este evento.
- **Reseñas** (opcional, solo si ya existía para eventos): igual que el curso.

El botón "Guardar Cambios" se mantiene en el header y solo aplica a las pestañas General y Detalles.

## 2. Order bump y checkout personalizado para eventos

La tabla `checkout_pages` y el editor `CheckoutPageEditorPage.tsx` **ya soportan `product_type = 'event'` y bump con cualquier producto** (course/ebook/event/community). No requiere cambios de esquema.

Trabajo:
- Añadir `productFilter` opcional a `CheckoutPagesPage.tsx`: cuando viene del editor de evento, la lista se filtra a las páginas cuyo `product_type='event'` y `product_id=<id>`, y el botón "Nueva página" navega a `/creator-app/checkout-pages/new?product_type=event&product_id=<id>`.
- En `CheckoutPageEditorPage.tsx`, leer esos query params al crear una página nueva y pre-seleccionar `productType`/`productId` (bloqueados si vienen por query).

## 3. Flujo de compra: invitado → checkout personalizado → MercadoPago

Hoy el `GuestCheckoutDialog` en `EventDetailPage`/`CourseDetailPage`/`EbookDetailPage` envía directo a MP. El nuevo flujo:

**a. Nueva RPC pública** `get_product_checkout_page(_product_type, _product_id)` → devuelve `{ creator_slug, page_slug }` de la página `is_published=true` más reciente para ese producto, o `null`. `GRANT EXECUTE` a `anon` y `authenticated`.

**b. Hook `useMercadoPagoCheckout`** (`src/hooks/useMercadoPagoCheckout.ts`):
- Nuevo parámetro `meta.hasCustomCheckout?: boolean` (calculado por la página del producto con la RPC anterior).
- En `submitGuestData`, si `hasCustomCheckout` **y** no estamos ya dentro de `/p/:creatorSlug/:pageSlug`:
  - Guarda `{ name, email, phone, productType, productId, ts }` en `sessionStorage` bajo `novu:guest_checkout`.
  - Navega a `/p/{creator_slug}/{page_slug}` (via `window.location.assign`) y **no** llama a `create-payment`.
- Si no hay página personalizada, sigue el flujo actual (directo a MP).

**c. `CheckoutPage.tsx`** (la página `/p/:creatorSlug/:pageSlug`):
- Al montar, lee `novu:guest_checkout` de `sessionStorage`. Si coincide con el `product_type`/`product_id` de la página y no expiró (30 min), guarda los datos en estado local `guestPrefill`.
- Al hacer clic en "Comprar ahora":
  - Si el usuario está autenticado → flujo actual.
  - Si hay `guestPrefill` → llama directamente a `submitGuestData(guestPrefill)` (con el bump elegido en la página) → va a MP sin volver a mostrar el diálogo.
  - Si no hay prefill y no está autenticado → abre `GuestCheckoutDialog` como hoy; al enviar, ya está en la página custom, así que va a MP (no vuelve a redirigir).
- Después de iniciar el pago, limpia `sessionStorage`.

**d. Páginas de detalle de producto** (`CourseDetailPage`, `EventDetailPage`, `EbookDetailPage`):
- Consultan `get_product_checkout_page` con React Query y pasan `hasCustomCheckout` al `startCheckout(...)`.
- Sin cambios visuales; el botón "Comprar" sigue igual.

**e. `create-payment` edge function**: sin cambios. La página de checkout ya envía `checkout_page_id` e `include_bump`, y el bump ya se agrega al preference de MP.

## Detalles técnicos

- La RPC nueva es `SECURITY DEFINER`, `SET search_path = public`, retorna solo páginas `is_published = true`.
- `sessionStorage` (no `localStorage`) para que los datos del invitado no persistan entre sesiones/navegadores.
- Se valida en `CheckoutPage` que el prefill sea para el mismo `product_id` para evitar mezclar compras.
- No se toca la tabla `orders` ni el webhook — el order bump ya se registra en `orders.metadata` desde `create-payment`.
- El editor de eventos deja el layout actual dentro de la pestaña General/Detalles, solo se envuelve en `<Tabs>` cuando `isEditing`. En modo "Nuevo evento" no hay pestañas (igual que hoy).

## Archivos afectados

- `src/pages/creator/EventEditorPage.tsx` — envolver en Tabs, agregar pestañas Inscritos y Página de pago.
- `src/pages/creator/CheckoutPagesPage.tsx` — aceptar `productFilter` opcional.
- `src/pages/creator/CheckoutPageEditorPage.tsx` — leer query params `product_type`/`product_id`.
- `src/hooks/useMercadoPagoCheckout.ts` — soporte `hasCustomCheckout` y redirección a `/p/...`.
- `src/pages/CheckoutPage.tsx` — leer prefill de invitado desde `sessionStorage`.
- `src/pages/CourseDetailPage.tsx`, `EventDetailPage.tsx`, `EbookDetailPage.tsx` — consultar y pasar `hasCustomCheckout`.
- Migración: RPC `get_product_checkout_page` + `GRANT EXECUTE`.
