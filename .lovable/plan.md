
# Página de confirmación de compra

Nueva ruta pública `/compra-confirmada/:reference` que reemplaza (para el caso `success`) a la actual `/payment/success`. Mantiene `/payment/failure` y `/payment/pending` sin cambios.

## 1. Base de datos (migration)

Ampliar `orders` con columnas mínimas — el resto ya existe (`product_type`, `product_id`, `user_id`, `amount_clp`, `creator_id`, `guest_email`, `created_at`, `metadata`):

- `reference` text UNIQUE — formato `NOV-{año}-{5 dígitos}`
- `installments` smallint — cuotas usadas en MP
- `pixel_fired` boolean default false
- `admin_email_sent` boolean default false
- `creator_email_sent` boolean default false

Trigger `BEFORE INSERT` en `orders` para autogenerar `reference` si viene null (año actual + 5 dígitos random, reintenta en colisión).

Nueva RPC `get_order_by_reference(_ref text)` (SECURITY DEFINER) que devuelve los mismos campos que `get_order_public` + `reference`, `installments`, `pixel_fired`, más el nombre + imagen del producto y nombre/slug del creador. Sin exponer datos internos.

Nueva RPC `mark_order_pixel_fired(_ref text)` que setea `pixel_fired=true` (idempotente).

Los campos "tiene_cuenta" y "id_comprador" ya viven en `orders.user_id` + `metadata.is_new_user`; no se duplican.

## 2. MercadoPago

- `create-payment`: guardar `back_urls.success` apuntando a `${SITE}/compra-confirmada/{reference}` (usando la `reference` recién generada, ya persistida en `orders`). Los flujos `failure` y `pending` siguen igual.
- `mercadopago-webhook`: al marcar `status=paid`, capturar `payment.installments` en `orders.installments`. Aquí se disparan los emails a admin (ya existe, se mantiene) y **nuevo** email al creador (`creator-new-sale`), controlados por `admin_email_sent` / `creator_email_sent` para evitar duplicados.

## 3. Frontend

Nueva página `src/pages/PurchaseConfirmedPage.tsx` (ruta `/compra-confirmada/:reference`, agregada al router antes del catch-all):

- Poll de `get_order_by_reference` (2s x 6) hasta `status=paid`.
- Diseño según spec: check amarillo #fcc70e animado, título, card con portada + nombre + creador + monto + cuotas + `reference` en monospace.
- Si `user_id` mapea a cuenta existente (no `metadata.is_new_user`) → botón amarillo "Acceder ahora →" al producto. Si es guest → card informativa con email y aviso de spam.
- Botón secundario outline "Explorar más productos →" a `/courses`.
- Meta Pixel: al confirmar `paid` y `pixel_fired=false`, resolver pixel del creador vía `get_creator_pixel_id_by_id`; si no hay, usar `NOVU_META_PIXEL_ID`. Disparar `Purchase` una sola vez, luego `mark_order_pixel_fired`. Guardado en `sessionStorage[fired_${reference}]` como segundo candado ante recargas rápidas.

`PaymentResultPage` queda solo para `failure`/`pending`. Redirect de compatibilidad: si llega a `/payment/success?order=…` resolver la `reference` y redirigir a la nueva ruta.

## 4. Emails (Lovable Emails / templates existentes en `_shared/transactional-email-templates/`)

- **Comprador sin cuenta**: ya se dispara `resetPasswordForEmail` en el webhook — mantener. No se cambia el remitente (Lovable Emails via `notificaciones.soynovu.cl`), no se introduce Resend porque el proyecto usa Lovable Emails. Si insistes en `hola@soynovu.cl` como From, requiere configurar ese buzón como sender verificado en la infra actual — lo dejo fuera del alcance salvo confirmación.
- **Admin (`admin-new-sale`)**: ya existe. Solo se ajusta el `to` para que también incluya `ignacio@raffamarketing.cl` (variable en `send-transactional-email` o override en `templateData`).
- **Creador (nuevo template `creator-new-sale.tsx`)**: crea plantilla React Email con nombre producto, comprador, monto bruto, comisión NOVU (10%), fee comunidad si aplica, ganancia neta, referencia, fecha y link a `/creator-app/finances`. Registrar en `registry.ts`. Enviar desde el webhook con `idempotencyKey=${order.id}-creator-sale` y guard `creator_email_sent`.

Deploy de `send-transactional-email`, `mercadopago-webhook`, `create-payment`.

## 5. Fuera de alcance (no se toca)

- `/payment/failure` y `/payment/pending`.
- Estructura de `orders.metadata` existente.
- Otros pixels (`MetaPixelTracker` global) — solo se agrega el `Purchase` dedupeado en la nueva página.
- Diseño global, sidebars, resto de rutas.

## Archivos

- **Nuevos**: `src/pages/PurchaseConfirmedPage.tsx`, `supabase/functions/_shared/transactional-email-templates/creator-new-sale.tsx`, 1 migration.
- **Editados**: `src/App.tsx` (ruta + redirect de `/payment/success`), `src/pages/PaymentResultPage.tsx` (redirect success→nueva), `supabase/functions/create-payment/index.ts` (back_url + generar reference), `supabase/functions/mercadopago-webhook/index.ts` (installments, email creador, admin CC), `supabase/functions/_shared/transactional-email-templates/registry.ts`.
