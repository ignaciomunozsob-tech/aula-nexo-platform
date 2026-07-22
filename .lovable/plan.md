## Verificación: correo de order bump solo se envía si hubo bump

### Estado actual (verificado)

En `supabase/functions/_shared/purchase-emails.ts` (línea 181-182), el envío del correo de order bump está protegido por esta condición:

```ts
!order.bump_email_sent && buyerEmail &&
order.bump_product_type && order.bump_product_id && (order.bump_amount_clp ?? 0) > 0
```

Es decir, se envía **solo si** la orden tiene los tres campos de bump poblados y el monto es mayor a 0. Si la persona no compró con order bump, esos campos quedan `null` y el bloque se salta por completo — no se manda ningún correo de bump.

El correo principal (curso/evento/ebook/comunidad) se envía siempre, independiente del bump.

### Plan

1. **Auditar en base de datos** las órdenes recientes pagadas sin bump y confirmar que `bump_email_sent = false` y que **no** aparecen filas de correo con `idempotencyKey` que termine en `-bump` para esas órdenes en `email_send_log`.
2. **Auditar** las órdenes recientes con bump y confirmar que sí tienen fila `-bump` en `email_send_log`.
3. Si algún caso muestra un correo de bump enviado sin bump real, revisar el registro puntual y agregar guarda adicional; si todo está limpio, dejar constancia y cerrar.

No se anticipan cambios de código — la guarda ya existe y es correcta. El plan es puramente de verificación.
