# Tracking Meta Pixel: order bump y página de pago personalizada

## Problema
El evento `Purchase` que llega al pixel de Meta del creador solo incluye el producto principal. El extra (order bump) nunca aparece como producto en Meta, aunque su monto sí se suma al valor. Tampoco se trackea el extra en `ViewContent` ni en `InitiateCheckout` de la página de pago personalizada. Además, la página antigua `/payment/success` puede disparar un `Purchase` duplicado sin protección anti-duplicados.

## Cambios

### 1. Purchase incluye el extra (PurchaseConfirmedPage.tsx)
- Leer los datos del extra de la orden (bump_product_id, bump_product_type, bump_amount_clp ya guardados en la orden).
- Si la orden incluyó extra: `content_ids` = [id principal, id extra], `num_items: 2`, y `contents` con ambos productos (id, cantidad, precio).
- Mantener la deduplicación actual (pixel_fired + sessionStorage) para no disparar dos veces.

### 2. ViewContent del extra en la página de pago (CheckoutPage.tsx)
- Cuando la página personalizada tiene extra activo, disparar `ViewContent` también para el producto extra (una sola vez por visita, con el mismo guard de useRef).

### 3. InitiateCheckout con ambos productos (useMercadoPagoCheckout.ts)
- Cuando el comprador seleccionó el extra, incluir su ID en `content_ids` y en `contents` del evento `InitiateCheckout`.

### 4. Eliminar disparo duplicado (PaymentResultPage.tsx)
- La página antigua `/payment/success` solo redirige a `/compra-confirmada/{reference}`; quitar su propio evento `Purchase` para evitar duplicados.

### 5. Verificar CAPI server-side (mercadopago-webhook)
- Confirmar que el evento Purchase del servidor incluya el extra y mantenga la deduplicación por referencia de orden (mismo event_id que el navegador).

## Verificación
- Typecheck limpio.
- Prueba con el pixel de prueba: compra con extra → un solo `Purchase` con ambos content_ids, sin duplicados.
