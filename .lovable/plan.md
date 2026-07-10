Después de revisar checkout, webhook, resultado de pago y flujo de invitados, encontré 5 bugs reales priorizados por impacto.

## 1. 🔴 Invitados no reciben un enlace válido para crear contraseña
**Dónde**: `supabase/functions/mercadopago-webhook/index.ts` (fulfillment de nuevo usuario).
**Qué pasa**: se llama `resetPasswordForEmail(buyerEmail, { redirectTo: `${origin}/reset-password` })`, pero `origin` viene de `req.headers.get('origin')` y MercadoPago **no envía header Origin**. Queda `""` y el link del correo apunta a `/reset-password` (URL relativa rota). El comprador nunca puede setear contraseña.
**Fix**: usar `https://soynovu.cl` como base fija para `redirectTo`.

## 2. 🟠 Email "nueva venta" al admin muestra 10% hardcodeado
**Dónde**: `mercadopago-webhook` → bloque `admin-new-sale`.
**Qué pasa**: recalcula `commissionClp = Math.round(amountClp * 0.10)` a mano. Si cambias `commission_pct` en `app_settings`, el email seguirá diciendo 10%.
**Fix**: leer `order.platform_amount_clp`, `creator_amount_clp`, `community_fee_clp` de la orden.

## 3. 🟠 Webhook itera hasta 500 tokens por evento
**Dónde**: `mercadopago-webhook`, fallback cuando el token de plataforma no lee el pago del seller.
**Qué pasa**: recorre todos los `creator_mercadopago_accounts` haciendo un `fetch` a MP por cada uno. Con más creadores se vuelve lento y puede timeoutear.
**Fix**: leer el `user_id` del payload/query de MP y consultar directo el token del seller correcto. Dejar el loop solo como último recurso.

## 4. 🟡 "Ir al contenido" apunta a rutas genéricas
**Dónde**: `src/pages/PaymentResultPage.tsx` → `linkFor`.
**Qué pasa**: para `event`, `ebook` y `community` devuelve `/app`. El comprador aterriza en el dashboard y tiene que buscar su compra.
**Fix**: priorizar `product_url` (ya viene en `order.metadata`) y rutas específicas por tipo.

## 5. 🟡 Mensaje inútil cuando el creador no tiene MercadoPago conectado
**Dónde**: `src/hooks/useMercadoPagoCheckout.ts`.
**Qué pasa**: `create-payment` responde 409 `{ error: 'creator_not_connected', message: '…' }`, pero el hook muestra "No se pudo iniciar el pago: FunctionsHttpError". El comprador no entiende.
**Fix**: leer `data?.error`/`data?.message` de la respuesta y mostrar el mensaje real en el toast.

---

## Detalles técnicos

- **Bug 1**: definir `const PUBLIC_SITE_URL = 'https://soynovu.cl'` en el webhook; usarlo en `redirectTo`.
- **Bug 2**: reemplazar cálculo local por los campos ya persistidos de `orders`.
- **Bug 3**: verificar si `creator_mercadopago_accounts` tiene columna `mp_user_id`; si no existe, añadirla en migración y guardarla en el callback OAuth. Preseleccionar con `.eq('mp_user_id', ...)`.
- **Bug 4**: usar `order.metadata.product_url` como link primario para todos los tipos, con fallback a rutas por tipo.
- **Bug 5**: al capturar el error de `functions.invoke`, inspeccionar `error.context?.response` o el `data` devuelto para extraer el `message` legible.

## Fuera de alcance
- Reescritura del flujo de pago.
- Cambios visuales/branding.
- Features nuevas (reintentos automáticos, panel de reconciliación).

¿Aplico los 5, o prefieres priorizar solo los rojos/naranjas (1–3)?