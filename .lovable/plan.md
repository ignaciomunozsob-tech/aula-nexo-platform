## Diagnóstico

El nuevo mensaje "La lección no fue guardada antes de iniciar la subida" viene de la Edge Function `bunny-create-video`, que ahora devuelve ese detalle cuando el frontend le manda un `lessonId` que empieza con `new-...`. Los logs de la Edge Function confirman exactamente eso:

```
[bunny-create-video] temporary lessonId received new-1783892923595
```

El código del editor **en el preview** ya está corregido:

- `CourseEditorPage.tsx` mantiene `modulesRef` sincronizado y `persistNewLesson` valida que el `id` devuelto sea un UUID real antes de retornarlo.
- `LessonVideoUploader.tsx` llama `await prepareLesson(...)` y aborta si no obtiene un UUID.
- La Edge Function ya rechaza limpiamente los `new-...` y devuelve `detail` legible.

El problema es que estás probando desde **`novuproject.lovable.app`** (dominio publicado, se ve en los logs de auth y en tu iPad). Esa URL sigue sirviendo el **bundle antiguo** del frontend, donde `prepareLesson` no persistía la lección antes de invocar Bunny. La Edge Function nueva atrapa ese bundle viejo y por eso ves el mensaje.

## Plan

1. **Publicar la app** para que el dominio `novuproject.lovable.app` cargue la versión corregida del editor (donde `persistNewLesson` sí crea el módulo/lección antes de pedir la firma a Bunny).
2. Después de publicar, en el iPad:
   - Cerrar la pestaña de `novuproject.lovable.app`.
   - Abrirla de nuevo (mejor en modo privado o forzando recarga) para descartar el cache de Safari.
   - Reintentar la subida del video.
3. Si aún apareciera el error tras recargar el bundle nuevo, revisar en los logs de `bunny-create-video` cuál es el `lessonId` recibido:
   - Si empieza por `new-` → el navegador sigue con bundle viejo (limpiar cache/Service Worker).
   - Si es un UUID pero da otro error → el problema ya no es el ID temporal y lo atacamos desde el detalle nuevo que devuelve la función.

## Notas técnicas

- No hay cambios de código pendientes: el preview ya contiene el fix completo (`modulesRef`, validación UUID, `prepareLesson` awaited, Edge Function con `detail`).
- El único paso pendiente es propagar ese bundle al dominio publicado vía Publicar.
