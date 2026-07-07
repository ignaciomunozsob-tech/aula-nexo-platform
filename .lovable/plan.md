Plan para permitir videos de más de 500 MB.

## Estado: Implementado

### Cambio realizado
- `src/hooks/useMyPlan.ts`: `maxFileMB` subido de **500 MB a 2048 MB (2 GB)** en `NOVU_PLAN`.
- Esto aplica tanto a videos directos (`LessonVideoUploader`) como a recursos de módulo (`ModuleResourcesEditor`), ya que ambos consumen el mismo límite.

### Verificaciones adicionales
- Los textos de los uploaders (`MP4, MOV, WEBM (máx. {maxFileMB}MB)`, etc.) ya son dinámicos, así que se actualizan automáticamente a 2 GB sin tocar más archivos.
- Supabase Storage permite objetos de hasta 5 GB, por lo que el tope de 2 GB es solo una validación de la app y no choca con el backend de storage.
- No se encontraron límites de tamaño ni timeouts explícitos en el bucket `protected-content` ni en la función `get-protected-url`.
- No se reintrodujo sistema de planes.
- No se modificó la lógica de column-level security / protected URLs.

### Validación sugerida
- Subir un video de 600 MB o más en `CourseEditorPage > LessonVideoUploader` y confirmar que no muestra "Archivo muy grande".
- Reproducir el video como estudiante en `CoursePlayerPage` para confirmar que `get-protected-url` sigue sirviendo la URL firmada.
