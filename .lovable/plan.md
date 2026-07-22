## Problema

Revisé los últimos pagos y `email_send_log` en la base de datos y confirmé lo que reportas:

- **Al comprador**: en compras de curso/ebook/comunidad nunca se le manda correo (0 envíos históricos de `buyer-course-purchase`, `buyer-ebook-purchase`, `buyer-community-purchase`). En eventos sólo se han enviado 3 confirmaciones frente a decenas de compras.
- **Al creador**: aunque la orden queda marcada como "creador notificado" (`creator_email_sent = true`), en el log de correos sólo aparecen 2 envíos reales de `creator-new-sale`. El resto quedó marcado como enviado sin que el correo se llegara a encolar.
- **Order bump**: cuando alguien compra un evento + ebook de bump, sólo se le da acceso al ebook, pero nunca recibe un correo con el link/acceso al producto del bump.

## Causa

En `supabase/functions/mercadopago-webhook/index.ts` el webhook llama a `admin.functions.invoke('send-transactional-email', ...)` y **no verifica el `error` que devuelve**. Cuando la invocación falla (por ejemplo un 4xx/5xx de la función de correo), la promesa igual resuelve sin lanzar excepción, el `catch` no se ejecuta y el flag `creator_email_sent` / `admin_email_sent` / `buyer_email_sent` se marca en `true`. Consecuencia: el sistema "cree" que ya avisó y nunca reintenta.

Además:
- El bloque de "buyer email" excluye `product_type = 'event'` y el bloque de evento no respeta ni marca `buyer_email_sent`, así que un webhook duplicado dispara varios correos.
- No hay ninguna rama que envíe el correo del producto del order bump al comprador.

## Cambios

Todo en `supabase/functions/mercadopago-webhook/index.ts` (una sola función, un solo redeploy):

1. **Helper `sendEmail(payload)`** que llama a `admin.functions.invoke('send-transactional-email', ...)`, revisa `error` y lo lanza. Así, si el envío falla, el `catch` correspondiente evita marcar el flag y el webhook puede reintentar en el próximo callback de MercadoPago.

2. **Correo al comprador (producto principal)**: reemplazar el bloque actual por una función `buildBuyerEmailForProduct(type, id)` que arme el template correcto para `course`, `ebook`, `community`. Guardar el flag `buyer_email_sent = true` sólo después de que `sendEmail` haya resuelto sin errores.

3. **Correo al comprador (evento)**: mover el bloque de `event-registration-confirmation` al mismo flujo con guardia `!order.buyer_email_sent` e idempotency key `evt-reg-<orderId>`, y marcar el flag al terminar. Elimina los envíos duplicados por reintentos del webhook.

4. **Correo al comprador (order bump)**: si `bump_product_type` + `bump_product_id` existen y el bump se cobró (`bump_amount_clp > 0`), enviar un segundo correo al comprador con el template del tipo de bump (`buyer-ebook-purchase`, `buyer-course-purchase`, `buyer-community-purchase`, o `event-registration-confirmation` si el bump es un evento). Usar idempotency key `<orderId>-buyer-bump-<type>` y una nueva columna `orders.bump_email_sent` (default false) para no repetir.

5. **Correos al admin y al creador**: dejar la lógica existente pero pasarla por el nuevo `sendEmail(...)` para que los flags sólo se marquen tras un envío real. Esto por sí solo destapa el envío que hoy no está llegando.

### Migración de base de datos

Nueva columna en `orders`:

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bump_email_sent boolean NOT NULL DEFAULT false;
```

No hay cambios de RLS ni de grants (la tabla ya está configurada); sólo se agrega la columna.

### Deploy

Re-desplegar `mercadopago-webhook` después de aplicar la migración. No se tocan templates ni la función `send-transactional-email`.

## Qué NO cambia

- No se modifica ningún template de correo, ni el asunto, ni el remitente.
- No se toca `send-transactional-email`, el sistema de colas, ni la infraestructura de emails.
- No se cambia la lógica de fulfillment (acceso al producto y al bump siguen otorgándose igual).
- No se reenvían correos históricos: la migración sólo aplica desde la próxima compra.

## Verificación

Después del deploy, en la próxima venta real (o una de prueba) revisar en la base:

```sql
SELECT reference, buyer_email_sent, creator_email_sent, admin_email_sent, bump_email_sent
FROM orders WHERE reference = 'NOV-...';
SELECT template_name, recipient_email, status, error_message
FROM email_send_log WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC;
```

Esperado: los 4 flags `true` para una compra con bump, y una fila `sent` por cada correo (comprador principal, comprador bump, creador, admin).
