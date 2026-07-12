## Lo que entendí

1. **Bunny es invisible para el usuario final**. Ni tú ni tus creadores ni los alumnos deberían ver "bunny", "video id", ni links de Bunny. Es solo el hosting por atrás.
2. **Auto-asociar los videos huérfanos**: yo hago el match, sin UI de arrastrar.
3. **En el editor del curso (vista creador)**: al subir un video (o cuando ya hay uno), debe aparecer un **reproductor real** con el video, no un texto "Video listo".

## Qué voy a hacer

### 1. Auto-asociación de videos huérfanos (una sola vez)

Script/edge function `bunny-auto-link` (admin-only, uso interno):
- Lista todos los videos de tu biblioteca Bunny.
- Cruza con `lessons.bunny_video_id` para detectar los huérfanos.
- Para cada huérfano, busca la lección con título más parecido (comparación normalizada: minúsculas, sin tildes, sin puntuación) **entre lecciones sin video del mismo curso si se puede inferir, o globalmente**.
- Aplica solo los matches con similitud alta (umbral configurable, ej. ≥ 0.85) y devuelve un reporte con:
  - Vinculados automáticamente.
  - Dudosos (similitud media) — te los muestro para que confirmes uno por uno.
  - Sin match.
- La yo la ejecuto por ti vía `curl_edge_functions` y te paso el resultado en el chat. Los dudosos te los presento y los resuelves con "sí/no".
- Al terminar, se elimina la función (igual que hicimos con `bunny-refresh-all`).

### 2. Reproductor real en el editor del curso (creador)

Reemplazar el bloque "Video listo ✅" de `LessonVideoUploader.tsx` por un **preview con el iframe de Bunny Stream** (`https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}`), usando la edge function `bunny-embed-config` que ya existe para obtener la URL firmada si aplica.

Cambios visuales:
- Cuando la lección tiene un video Bunny en estado `ready` → se muestra el **player embebido** (no texto).
- Debajo del player, un botón discreto **"Reemplazar video"** que abre el selector de archivo.
- Se elimina toda mención a "Bunny" en el UI. Los estados pasan a decir:
  - "Subiendo video… X%"
  - "Procesando video…" (lo que antes decía "procesando en Bunny")
  - "Video listo" solo como fallback si el player no carga.
- Videos legacy (bucket `protected-content`) también se muestran con un `<video>` player en vez de solo el nombre de archivo.

### 3. Limpieza de textos "Bunny" en el resto de la app

Revisar y quitar menciones a "Bunny" visibles al usuario en:
- `LessonVideoUploader.tsx` (toasts y estados).
- Cualquier página de admin/creator donde aparezca la palabra.

Se mantiene "Bunny" solo en nombres de funciones/columnas internas y en `AdminVideoMigrationPage` (que es puramente admin y ayuda a debuggear).

## Fuera de alcance

- No cambio el player del alumno (solo el del editor del creador), a menos que también esté mostrando algo raro — dime si es el caso.
- No borro videos huérfanos que no logren match automático; te los reporto y decides.
- No toco esquema de base de datos.

## Orden de ejecución cuando pases a build

1. Actualizo `LessonVideoUploader.tsx` con el player embebido y textos sin "Bunny".
2. Creo `bunny-auto-link`, la ejecuto, te muestro el reporte.
3. Confirmas los dudosos → aplico esos matches.
4. Elimino la función temporal.
