# Debug + verificar firma Bunny

Solo tocar `supabase/functions/bunny-sign-embed/index.ts`. Nada más.

## Cambios

1. **Sanitizar entradas** para descartar espacios/saltos accidentales:
   - `const SECURITY_KEY = (Deno.env.get('BUNNY_SECURITY_KEY') ?? '').trim()`
   - `const LIBRARY_ID = (Deno.env.get('BUNNY_LIBRARY_ID') ?? '').trim()`
   - `videoId = String(body.videoId).trim()`

2. **Confirmar el cálculo** (ya cumple, solo re-afirmar):
   - `expires = Math.floor(Date.now()/1000) + 3600` (segundos, no ms).
   - `hash = sha256Hex(SECURITY_KEY + videoId + expires)` en hex **minúsculas** (el `toString(16)` de JS ya devuelve minúsculas).
   - URL: `https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/{videoId}?token={hash}&expires={expires}`.

3. **Logs de diagnóstico** (visibles en Edge Function logs, nunca se devuelven al cliente):
   ```ts
   console.log('[bunny-sign-embed]', JSON.stringify({
     videoId,
     expires,
     libraryId: LIBRARY_ID,
     securityKeyLength: SECURITY_KEY.length,  // sin exponer el valor
     securityKeyPreview: SECURITY_KEY.slice(0, 4) + '…',
     hash,
     url,
   }));
   ```
   El valor completo de `BUNNY_SECURITY_KEY` NO se loguea (es secreto). Se muestra longitud + primeros 4 chars para verificar que la variable está bien inyectada.

4. **Confirmar generación server-side**: la función ya corre en Deno (edge). El cliente solo recibe `{ url, expires }` — nunca ve la key ni recalcula el hash. No hay cambios de cliente necesarios; ambos consumidores (`CoursePlayerPage`, `LessonVideoUploader`) ya usan `bunnyEmbedUrl` de esta función.

## Nota sobre el 403 persistente

Si tras esto Bunny sigue devolviendo 403, la causa probable no es el hash sino la configuración de la Video Library en Bunny:

- **Token Authentication** debe estar activo en la Library (Bunny.net → Stream → Library → Security).
- El campo secreto de la Library debe coincidir con `BUNNY_SECURITY_KEY`. En algunas Libraries la clave se llama "Token Authentication Key" y es distinta de la "API Key".
- Algunas configuraciones exigen incluir también la **ruta** (`/embed/{lib}/{vid}`) o el **IP** del cliente en el hash. La convención "solo videoId + expires" es la del Direct Play URL / embed simple; si la Library está en modo "Token Authentication with path", este hash devolverá 403 aunque sea correcto.

Lo confirmaré en el mensaje final junto a los logs para que compares el `securityKeyPreview` con el que ves en el panel de Bunny.
