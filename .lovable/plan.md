## Contexto

`/admin` no te deja entrar porque no hay ningún usuario con rol `admin` en la base. Eso también bloquea las edge functions `bunny-migrate-lesson` y `bunny-cleanup-legacy`, que validan admin. Vamos a evitar ese muro con una función server-side de un solo uso, protegida por un token que sólo yo pasaré.

## Plan

### 1. Generar un secreto de migración
- `generate_secret` → `BUNNY_MIGRATION_TOKEN` (64 caracteres, random). No lo verás, no lo compartes, sólo lo usa el edge function.

### 2. Nueva edge function `bunny-migrate-batch`
- Endpoint POST, sin JWT (auth por header `X-Migration-Token`).
- Compara contra `BUNNY_MIGRATION_TOKEN`; si no coincide → 401.
- Lista todas las lecciones con `video_source='legacy'` y `video_url` no-http.
- Por cada una, hace exactamente lo mismo que `bunny-migrate-lesson`: crea video en Bunny, descarga del bucket, PUT a Bunny, update de la lección. Registra progreso en `video_migration_jobs` (para poder auditar después desde SQL).
- Devuelve `{ total, done, errors: [...] }`.

### 3. Ejecutarla desde acá
- Con `supabase--curl_edge_functions`, POST a `/bunny-migrate-batch` con `X-Migration-Token`.
- Timeout de edge functions es 150s. Si no alcanza para las 19, la función procesa por bloques (ej. 6 por invocación) y devuelve `remaining > 0`; la llamo de nuevo hasta que llegue a 0.
- Verifico con SQL: `SELECT count(*) FROM lessons WHERE video_source='bunny'`.

### 4. Después de migrar
- Reporto: cuántas OK, cuántas con error y el motivo.
- **NO borro los originales del bucket.** Quedan intactos para rollback. Cuando confirmes que todo se ve bien en el player, hacemos la limpieza en un segundo paso (otro batch guardado por el mismo token, o te promovemos a admin y usas el botón rojo).

### 5. Limpieza del token
- Cuando termine, borro el edge function `bunny-migrate-batch` y el secreto `BUNNY_MIGRATION_TOKEN` para no dejar una puerta abierta.

## Fuera de alcance

- No tocamos `bunny-migrate-lesson` original ni el panel `/admin/video-migration` (siguen ahí para el futuro).
- No cambiamos roles de usuario.
- No borramos nada del bucket todavía.

## Detalle técnico

- Archivos nuevos: `supabase/functions/bunny-migrate-batch/index.ts`.
- Sin cambios de DB.
- Sin cambios de frontend.

¿Le doy?