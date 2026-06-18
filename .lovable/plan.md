## Diagnóstico

El test de email en Cloud → Emails funciona porque usa otro path, pero la cola real (`process-email-queue`) falla al despachar al proveedor con:

```
Email API error: 403 lovable_api_key_not_registered
"LOVABLE_API_KEY is not registered for this project"
```

Flujo verificado en logs (último intento de login a las 01:01 UTC):
1. `send-2fa-code` → ✅ booted, ejecuta sin error
2. `send-transactional-email` → ✅ "Transactional email enqueued" (templateName `2fa-code`, recipient correcto)
3. `process-email-queue` → ❌ 403 al llamar al Email API porque la `LOVABLE_API_KEY` actual del proyecto no está registrada en el registry de Lovable

Por eso el código se encola, el frontend dice "código enviado", pero nunca sale del worker → no llega al inbox.

## Causa

La `LOVABLE_API_KEY` del proyecto está desincronizada con el registry (causa típica: la key se generó/copió en un estado anterior y no quedó registrada activa para este workspace). El fix oficial es **rotar la key** — esto regenera y reregistra la key, y actualiza el secret automáticamente.

## Plan

1. **Rotar `LOVABLE_API_KEY`** con la herramienta `lovable_api_key--rotate_lovable_api_key` (idempotente, actualiza el secret del proyecto solo).
2. **Redeploy de `process-email-queue`** para que el worker tome la key nueva en su próximo boot (los edge functions leen secrets al arrancar).
3. **Reintentar los mensajes en cola**: los mensajes 7 y 8 quedaron en la queue con `failed_attempts: 0`. Con visibility timeout, el cron los reintenta automáticamente cada ~5s una vez la key sea válida. No hace falta acción manual.
4. **Verificación**:
   - Pedirte que intentes login de nuevo (genera un código fresco).
   - Revisar logs de `process-email-queue` → debe aparecer "Email sent" en vez del 403.
   - Confirmar recepción en `ignaciomunozsob@gmail.com`.

## Fuera de alcance

- No tocar templates, RLS, ni la lógica de `send-2fa-code` (todo eso funciona).
- No tocar DNS (`notificaciones.soynovu.cl` está OK, si no, el test tampoco enviaría).
- No vaciar la cola manualmente.

## Detalles técnicos

- La rotación reemplaza la key activa; la anterior se invalida en hasta 1 hora, pero el worker usará la nueva apenas redeployemos.
- Si tras rotar + redeploy el 403 persiste con `lovable_api_key_not_registered`, escalamos a soporte (no hay otro fix del lado del proyecto).
