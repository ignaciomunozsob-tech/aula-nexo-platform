Plan para permitir videos de más de 500 MB.

## Contexto actual
- `src/hooks/useMyPlan.ts` define `maxFileMB: 500` para todos los creadores (NOVU ya no usa planes diferenciados; todos tienen el mismo límite).
- `src/components/layout/LessonVideoUploader.tsx` usa `maxFileMB` para validar `file.size > maxSize` y rechaza el archivo antes de subirlo.
- `src/components/creator/ModuleResourcesEditor.tsx` también usa `maxFileMB` para recursos de módulo.
- Supabase Storage soporta archivos de hasta 5 GB, por lo que el bloqueo es solo la validación frontend.

## Cambios propuestos
1. Subir `maxFileMB` en `NOVU_PLAN` de 500 MB a un valor mayor que el usuario confirme (por ejemplo 1024 MB, 2048 MB o 5000 MB). Para no reintroducir planes, se cambia la constante global.
2. Revisar y actualizar los textos visibles de "Máx. 500MB" en los uploaders para reflejar el nuevo límite (están dinámicos con `{maxFileMB}`, así que se actualizan solos).
3. Verificar que el bucket `protected-content` no tenga un límite de tamaño de objeto inferior al nuevo tope.
4. Revisar si `createSignedUploadUrl` / signed PUT tiene timeout de red que pueda afectar archivos muy grandes en conexiones lentas; de ser necesario, documentar que la subida depende de la conexión del usuario.

## No incluido
- No se reintroduce un sistema de planes con límites diferentes.
- No se cambia la lógica de column-level security / protected URLs que ya está en producción.

## Validación
- Subir un video de 600 MB (o más) en `CourseEditorPage > LessonVideoUploader` y confirmar que no muestra "Archivo muy grande".
- Comprobar que el estudiante puede reproducir el video en `CoursePlayerPage` vía `get-protected-url`.

## Pregunta para el usuario
¿Hasta qué tamaño quieres permitir? Opciones razonables: 1 GB, 2 GB o el máximo de 5 GB.