## Diagnóstico

Los videos **no se borraron**. Los 19 archivos subidos siguen intactos en el bucket privado `protected-content` de Lovable Cloud, y la tabla `lessons` sigue apuntando a ellos:

- 23 lecciones con `video_source='legacy'` (19 con `video_url` apuntando al path del storage, 4 sin video).
- 0 lecciones migradas a Bunny todavía.
- El bucket y los objetos están intactos (la migración a Bunny sólo agregó columnas nuevas, nunca borró nada).

El bug es en la **UI del editor y del player**, que dejaron de reconocer el modo `legacy`:

### 1. Editor de lección (`LessonVideoUploader.tsx`)
El `useEffect` sólo lee `bunny_status / bunny_video_id / video_source`. Como los legacy tienen `video_source='legacy'`, nunca setea estado — y como `currentUrl` es un path (no `http…`), el modo por defecto salta a "Subir video" mostrando el dropzone vacío. El creador cree que perdió el archivo.

### 2. Player (`CoursePlayerPage.tsx`)
La rama de legacy existe (usa `resolveProtectedUrl → get-protected-url`), pero conviene verificar en pantalla que efectivamente reproduce los legacy actuales. Si algún alumno reportó "no carga", puede ser un problema puntual de sesión/enrollment y no de datos.

---

## Plan

### Paso 1 — Arreglar el editor para mostrar el video legacy existente
En `LessonVideoUploader.tsx`:

- Leer también `video_url` en el `useEffect`.
- Si `video_source='legacy'` y hay `video_url` (path no-http), mostrar el bloque "Video listo" con nombre del archivo y botón para reemplazar/eliminar — igual que ya se hace para `bunny.status='ready'`.
- No cambiar el modo por defecto cuando ya hay un legacy: seguir en "Subir video" pero con el archivo visible arriba del dropzone.
- El botón "Eliminar" para legacy debe pedir confirmación (borra `video_url` y deja la lección sin video; NO borra el objeto del storage, para poder recuperarlo).

### Paso 2 — Verificar el player con un video legacy
Abrir una lección legacy en el player (alumno inscrito) y confirmar que `get-protected-url` responde con la URL firmada y el `<video>` reproduce. Si falla, revisar logs de la function y ajustar.

### Paso 3 — Comunicar al usuario cómo migrar (opcional, sin código nuevo)
Recordar que ya existe `/admin/video-migration` para mover los 19 videos legacy a Bunny cuando quiera. Mientras no lo haga, seguirán reproduciéndose desde Lovable Cloud sin problema.

---

## Fuera de alcance

- No se toca el bucket `protected-content` ni se borran objetos.
- No se cambia el flujo de subida nueva a Bunny.
- No se modifica el player más allá de verificar; si aparece un bug concreto, se aborda con un plan aparte.

## Detalles técnicos

- Archivo modificado: `src/components/layout/LessonVideoUploader.tsx`.
- Nuevo estado local `legacyFilename` derivado del path (`video_url.split('/').pop()`).
- `handleRemoveVideo` ya limpia `video_url`, así queda igual.
- Sin cambios de DB, sin cambios en edge functions.