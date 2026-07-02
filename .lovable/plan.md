## Diagnóstico

Al revocar el SELECT de `video_url`/`file_url` en `lessons` y `lesson_resources`, quedaron dos huecos:

1. **Vista del alumno (`CoursePlayerPage`)** hace `select *` sobre `lessons` y `lesson_resources`. Al incluir columnas prohibidas, PostgREST devuelve *permission denied* y el listado queda vacío — por eso el alumno no ve módulos ni lecciones.
2. **Vista pública del curso (`CourseDetailPage`)** consulta `course_modules` con join a `lessons` como visitante `anon`, pero `anon` no tiene ningún SELECT sobre columnas de `lessons`/`lesson_resources`. El temario aparece vacío para visitantes no logueados.
3. El video "no queda guardado" es en realidad el mismo síntoma: se guarda bien en la base, pero al refetch la vista del alumno no muestra la lección, aparentando pérdida.

## Cambios

### Frontend
- `src/pages/app/CoursePlayerPage.tsx`: reemplazar `select('*')` en la query `course-modules-player` por columnas explícitas seguras:
  - `lessons`: `id, module_id, title, order_index, type, content_text, duration_minutes, description`
  - `lesson_resources`: `id, lesson_id, file_name, created_at`
  - El `video_url` sigue resolviéndose vía `resolveProtectedUrl('lesson_video', ...)` y los recursos ya usan `get-protected-url` para descargar.

### Base de datos (migración)
- Otorgar SELECT a `anon` sobre columnas no sensibles de `lessons` (`id, module_id, title, order_index, type, content_text, duration_minutes, description, created_at`) y `lesson_resources` (`id, lesson_id, file_name, created_at`), para que la página pública del curso muestre el temario a visitantes.
- Mantener revocado el SELECT sobre `video_url` y `file_url` para ambos roles (la seguridad se conserva).

### Validación
- Abrir la vista del alumno de un curso con módulos/lecciones: deben listarse módulos, lecciones y reproducirse el video vía URL firmada.
- Abrir la página pública del curso sin sesión: el temario debe mostrar módulos y títulos de lección.
