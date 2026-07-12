# Firma de tokens para Bunny Stream

Objetivo: nunca exponer `BUNNY_SECURITY_KEY` al cliente. Toda URL de iframe de Bunny debe generarse en el servidor con token firmado (1h de expiración).

## 1. Nueva edge function: `bunny-sign-embed`

Archivo: `supabase/functions/bunny-sign-embed/index.ts`

- Recibe `{ videoId: string }` en el body (validado con Zod, string no vacío).
- Lee `BUNNY_LIBRARY_ID` y `BUNNY_SECURITY_KEY` del entorno.
- Calcula:
  - `expires = Math.floor(Date.now()/1000) + 3600`
  - `token = sha256Hex(BUNNY_SECURITY_KEY + videoId + expires)` usando `crypto.subtle.digest("SHA-256", ...)` y conversión a hex.
- Responde `{ url, expires }` donde
  `url = https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token={token}&expires={expires}`
- CORS estándar; maneja `OPTIONS`.
- Sin verificación adicional de acceso (el gating de acceso al curso ya lo aplica el resto de la app; esta función solo firma).

No se modifica `supabase/config.toml` (usa el default de Lovable, `verify_jwt = false` como el resto de funciones bunny-*).

## 2. Reemplazar iframes actuales

### `src/pages/app/CoursePlayerPage.tsx` (línea ~416-419)

Reemplazar la query `bunny-embed-config` por una query `bunny-signed-embed` parametrizada por `bunny_video_id`:

- `useQuery(["bunny-signed-embed", videoId], () => invoke("bunny-sign-embed", { body: { videoId } }))`
- `enabled: isBunnyVideo && bunny_status === 'ready'`
- `staleTime: 50 * 60 * 1000` (menor a 1h para refrescar antes de expirar)
- `refetchInterval: 55 * 60 * 1000`
- El iframe usa `src={signed.url}` en vez de construir la URL manualmente.
- Mientras `isLoading`, mostrar el mismo placeholder de "cargando" ya existente.

### `src/components/layout/LessonVideoUploader.tsx` (línea ~296-311)

Misma sustitución: reemplazar `bunny-embed-config` + URL construida a mano por query `bunny-sign-embed` con `hostedVideoId`. `enabled: hasHostedVideo`.

## 3. Limpieza

- `bunny-embed-config` deja de ser usado por el cliente. Lo dejamos en el repo (por si otras funciones lo consumen internamente) pero **no se toca** — la instrucción es no modificar lo no mencionado.
- Ningún cambio de esquema, RLS, ni de otras funciones.

## Detalles técnicos

```ts
// SHA-256 hex en Deno
const enc = new TextEncoder().encode(BUNNY_SECURITY_KEY + videoId + expires);
const digest = await crypto.subtle.digest("SHA-256", enc);
const token = [...new Uint8Array(digest)]
  .map(b => b.toString(16).padStart(2, "0")).join("");
```

Requisito previo: la Video Library en Bunny debe tener **Token Authentication** habilitado para que Bunny valide el `token`/`expires`. Si no está activo, las URLs firmadas seguirán funcionando pero también las no firmadas (no rompe nada). Confirmaré en el mensaje final que hay que activarlo en el panel de Bunny.
