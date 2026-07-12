## Problema

Todas las tablas del esquema `public` quedaron **sin permisos (GRANT)** para los roles `authenticated` y `anon`. Verificado con `information_schema.table_privileges`: cero filas para el esquema `public`.

Con RLS activa pero sin GRANT, PostgREST responde **403 permission denied** en todo:
- Alumno abre un curso → falla al leer `courses`, `course_modules`, `lessons`.
- Creador entra al editor → falla al leer `lessons.video_url`, por lo que la lección aparece como "sin video" y se muestra el uploader de nuevo.

Esto no es un bug de las políticas RLS (las políticas están correctas) ni del player: es una falta de GRANT a nivel Postgres.

## Solución

Una sola migración SQL que reponga los GRANTs en todas las tablas de `public`, respetando qué tablas deben ser legibles por `anon`:

1. **Bulk grant a `authenticated` y `service_role`** en todas las tablas base de `public` (loop sobre `pg_class`):
   - `authenticated` → `SELECT, INSERT, UPDATE, DELETE`
   - `service_role` → `ALL`
   
   La RLS sigue filtrando fila por fila; el GRANT solo abre la puerta de la Data API.

2. **GRANT SELECT explícito a `anon`** solo en las tablas con política pública real, según `pg_policies`:
   - `courses`, `events`, `ebooks`, `one_on_one_sessions` (published viewable publicly)
   - `course_modules` (viewable si el curso está publicado)
   - `categories`
   - `communities` (viewable when published)
   - `creator_availability_rules`, `creator_availability_settings`, `session_availability_rules`
   - `profiles` (necesario para resolver `creator_slug` en el storefront público)

   El resto (lessons, enrollments, orders, lesson_progress, creator_billing_info, 2FA, etc.) **no** recibe acceso `anon`: siguen siendo solo para usuarios autenticados vía sus políticas RLS existentes.

3. **Re-grant de columnas específicas** ya hecho previamente en `lessons` (`bunny_video_id, bunny_status, video_source`) sigue vigente; no se toca.

## Verificación

Tras aplicar la migración:
- Ejecutar `SELECT count(*) FROM information_schema.table_privileges WHERE table_schema='public'` para confirmar que ya no es 0.
- Alumno abre curso "Meta Ads desde Cero" → ver módulos/lecciones sin 403.
- Creador abre editor de un curso con video ya subido → el reproductor debe aparecer en vez del uploader.

## Detalles técnicos

```text
Migration file: supabase/migrations/<timestamp>_restore_public_grants.sql
- DO $$ ... $$ loop → GRANT authenticated + service_role sobre cada tabla base de public
- GRANT SELECT ON <lista pública> TO anon;
```

No se modifica ninguna política RLS, ni código del frontend, ni edge functions.
