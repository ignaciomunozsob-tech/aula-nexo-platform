## Problema

El error `new row violates row-level security policy` aparece al subir la portada de un **evento** o **e-book**. La política del bucket `course-assets` exige que el primer segmento de la ruta sea el `auth.uid()` del usuario:

```
(storage.foldername(name))[1] = auth.uid()::text
```

Pero los editores construyen la ruta al revés:

- `EventEditorPage.tsx` → `events/${user.id}/cover-*.ext` (primer segmento = `"events"`)
- `EbookEditorPage.tsx` cover → `ebooks/${user.id}/cover-*.ext` (primer segmento = `"ebooks"`)

Por eso storage rechaza el INSERT. Los cursos (`CourseCoverUploader`) sí funcionan porque usan `${user.id}/courses/...`.

## Fix

Invertir el orden de las carpetas para que `user.id` quede primero:

1. `src/pages/creator/EventEditorPage.tsx` (línea 186)
   `events/${user.id}/cover-...` → `${user.id}/events/cover-...`

2. `src/pages/creator/EbookEditorPage.tsx` (línea 175)
   `ebooks/${user.id}/cover-...` → `${user.id}/ebooks/cover-...`

Cambios mínimos, sin tocar RLS ni el bucket. Las portadas antiguas (si las hubiera) siguen sirviéndose porque el bucket es público; solo cambia dónde se guardan las nuevas.