# Migración de videos a Bunny.net Stream

Solo se toca lo relacionado con **videos de lecciones**. PDFs, imágenes, ebooks y recursos siguen en Lovable Cloud sin cambios.

---

## 1. Requisitos previos (acción tuya)

Necesito que confirmes que estos 3 secretos ya están guardados en el backend (yo veo la lista de secretos y **no aparecen**). Debes agregarlos antes de que la migración funcione:

- `BUNNY_LIBRARY_ID` — ID numérico de tu Video Library en Bunny.
- `BUNNY_API_KEY` — API Key de esa Library (no la de la cuenta).
- `BUNNY_CDN_HOSTNAME` — hostname del pull zone conectado (ej. `vz-xxxx.b-cdn.net`).

Si me confirmas que quieres avanzar, te abro el formulario seguro para pegarlos.

---

## 2. Cambios en base de datos

Migración nueva. Sobre la tabla `lessons`:

- `bunny_video_id text` — id devuelto por Bunny.
- `bunny_status text default 'ready'` — `uploading | processing | ready | error`.
- `video_source text default 'legacy'` — `legacy` (storage antiguo) | `bunny` | `external` (YouTube/Vimeo).
- `bunny_migrated_at timestamptz`.

`video_url` se mantiene como está para no romper contenido existente.

Además, tabla nueva `video_migration_jobs` (para el panel admin):
- `lesson_id`, `status` (`pending|running|done|error`), `error_message`, timestamps.

---

## 3. Subida nueva (panel creador)

Reemplazo del flujo actual en `LessonVideoUploader.tsx` para modo "Subir MP4":

1. Frontend llama a edge function `bunny-create-video` con `{ lessonId, title }` → crea el video en Bunny y devuelve `{ videoId, uploadUrl, uploadHeaders }`. Guarda `bunny_video_id` y `bunny_status='uploading'` en la lección.
2. Frontend hace `PUT` con XHR (para mostrar barra de progreso, igual que hoy) directamente a `https://video.bunnycdn.com/library/{lib}/videos/{videoId}` con el header `AccessKey`. **Aquí la AccessKey queda expuesta al navegador durante el PUT** — es la única forma de mantener el progreso real. Si prefieres seguridad estricta, alternativa: subir a nuestro edge function como proxy (pierde progreso preciso). Por defecto usaré la variante directa; dime si prefieres proxy.
3. Frontend hace polling a edge function `bunny-video-status` cada 5s. Al llegar `ready`, se guarda `video_source='bunny'`, `bunny_status='ready'` y la URL `https://{CDN}/{videoId}/play_720p.mp4` (aunque el player usa iframe).
4. Mientras procesa, el editor muestra "Tu video se está procesando…".

Las URLs de YouTube/Vimeo siguen funcionando como hoy (`video_source='external'`).

---

## 4. Reproductor

En `CoursePlayerPage.tsx` (y donde se reproduzcan lecciones):

- Si `video_source='bunny'` y hay `bunny_video_id`: iframe de Bunny (`iframe.mediadelivery.net/embed/{lib}/{videoId}`), 100% ancho, aspect-ratio 16/9, radius 12px.
- Si `video_source='external'`: comportamiento actual (YouTube embed).
- Si `video_source='legacy'`: comportamiento actual con `get-protected-url` (hasta que la migración lo pase a `bunny`).

---

## 5. Protección anti-descarga

En el edge function que crea el video, activo en la lección de Bunny:
- **Token Authentication** en la Library (setting `EnableTokenAuthentication`).
- **Referrer allowlist** con `soynovu.cl`, `www.soynovu.cl` y el dominio de preview.

El iframe embed valida el referer → los `.mp4` directos dejan de ser accesibles. Para máxima seguridad, si quieres firma por sesión de usuario, requiere un edge function extra `bunny-sign-embed` que genere token JWT por lección + user; puedo agregarlo en un segundo paso.

---

## 6. Migración de videos existentes

Edge function `bunny-migrate-lesson` (idempotente, una lección por invocación):
1. Marca job `running`.
2. Descarga el objeto de `protected-content` con service role.
3. Crea video en Bunny + PUT del archivo.
4. Actualiza la lección (`bunny_video_id`, `video_source='bunny'`, `bunny_migrated_at`).
5. **NO borra** el archivo original todavía (rollback safety). Un segundo edge function `bunny-cleanup-legacy` lo borra cuando confirmes en admin.
6. Job `done` o `error`.

Trigger: página nueva en `/admin/video-migration` con:
- Botón "Encolar todas las lecciones legacy".
- Barra de progreso `X de Y migrados`, contador de errores, lista de fallidas con motivo.
- Botón "Reintentar fallidas".
- Botón "Eliminar originales de Storage" (aparece solo cuando `Y - X = 0`).

La migración corre en segundo plano invocando el edge function en loop desde la propia página admin mientras esté abierta (más simple que cron; puedo cambiar a cron si prefieres desatendido).

---

## 7. Fuera de alcance

- No se tocan ebooks, PDFs, imágenes ni ningún otro archivo.
- No se cambia el flujo de pagos, comunidades, ni auth.
- No se rediseña el player más allá del embed nuevo.

---

## Detalles técnicos

**Nuevas edge functions:**
- `bunny-create-video` (POST, JWT requerido, valida `can_manage_lesson`)
- `bunny-video-status` (POST, JWT)
- `bunny-migrate-lesson` (POST, admin only)
- `bunny-cleanup-legacy` (POST, admin only)

**Archivos frontend a modificar:**
- `src/components/layout/LessonVideoUploader.tsx` — flujo Bunny + polling.
- `src/pages/app/CoursePlayerPage.tsx` — render iframe según `video_source`.
- `src/pages/admin/AdminDashboard.tsx` o nueva `AdminVideoMigrationPage.tsx` + ruta.
- `src/App.tsx` — registrar ruta admin.

**Types:** se regeneran automáticamente tras la migración.

---

## Preguntas antes de implementar

1. ¿Confirmas los 3 secretos de Bunny? (si dices sí, te abro el formulario).
2. Subida directa desde el navegador (con AccessKey visible durante el PUT) **o** proxy vía edge function (más seguro, sin barra de progreso precisa)?
3. ¿Token por sesión de usuario ahora, o basta con Referrer + Token Auth de Library como primer paso?
