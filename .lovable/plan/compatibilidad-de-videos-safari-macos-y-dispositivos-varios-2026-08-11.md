# Compatibilidad de videos (Safari / macOS y dispositivos varios)

## Qué está pasando hoy

Todos los videos alojados se muestran con el reproductor de Bunny dentro de un `iframe` con URL firmada (token de 1 hora). Al revisar el código encontré tres inconsistencias que explican fallos intermitentes por dispositivo/navegador:

1. **Política de referrer distinta según la pantalla.** El reproductor del curso y el del editor de lecciones usan `referrerPolicy="no-referrer"`, mientras que el de eventos usa `strict-origin-when-cross-origin`. Si la librería tiene restricción por dominios permitidos, el navegador que no envía origen recibe 403. Safari es especialmente estricto con esto.
2. **Token de 1 hora sin renovación real ni reintento.** La URL firmada se cachea 50 min y se refresca cada 55 min, pero si la pestaña queda suspendida (muy común en Safari/macOS y iOS) el iframe puede quedar con un token vencido y falla sin recuperarse. No hay refetch al volver a la pestaña ni reintento ante error.
3. **Sin detección de error del reproductor.** Si el iframe falla, el usuario ve un recuadro negro sin mensaje ni botón de reintentar; no tenemos señal de qué falló.

## Qué voy a hacer

**1. Unificar el reproductor en un solo componente**
Crear un componente único `BunnyPlayer` usado por: reproductor del curso, página de evento del alumno, editor de lecciones y subida de grabación de evento. Con esto la configuración deja de divergir entre pantallas.

Configuración única:
- `referrerPolicy="strict-origin-when-cross-origin"` en todos lados (envía el origen que Bunny espera).
- Parámetros de embed consistentes: sin autoplay, precarga activa, modo responsive.
- Permisos de iframe completos (pantalla completa, picture-in-picture, medios cifrados) más `playsinline` para iOS.

**2. Manejo robusto del token firmado**
- Refrescar la URL firmada cuando la pestaña vuelve a estar visible o el equipo despierta de suspensión.
- Reducir la ventana de caché para que nunca se use un token cerca de vencer.
- Reintento automático (una vez) si el reproductor no carga, pidiendo una firma nueva.

**3. Estado de error visible y accionable**
Si tras el reintento el video no carga: mensaje claro en español con botón "Reintentar" y registro del motivo en consola para diagnóstico.

**4. Compatibilidad de los archivos que se suben**
- Aviso en el subidor sobre formatos recomendados (MP4 H.264 + AAC) y advertencia cuando el archivo es `.mov`/HEVC, que son los que más problemas dan si no se transcodifican.
- Revisar que la librería de video entregue reproducción adaptativa estándar (HLS), que es lo que Safari necesita; si detecto que la configuración de la librería no lo permite, te lo indico para ajustarlo en el panel de Bunny (eso no se puede cambiar desde el código).

**5. Verificación**
Probar la reproducción en emulación de Safari/WebKit y en viewport móvil sobre un curso y un evento reales, y confirmar que la URL firmada responde 200.

## Detalles técnicos

- Nuevo `src/components/video/BunnyPlayer.tsx`: recibe `videoId` + `title`, resuelve la firma vía `bunny-sign-embed`, gestiona caché/refresco/reintento y renderiza el iframe.
- Reemplazo del iframe inline en `src/pages/app/CoursePlayerPage.tsx`, `src/pages/app/StudentEventPage.tsx`, `src/components/layout/LessonVideoUploader.tsx` y `src/components/creator/EventRecordingUploader.tsx`.
- Refresco de firma con listeners `visibilitychange` / `pageshow`, `staleTime` a ~30 min y `refetchOnWindowFocus`.
- Sin cambios de esquema ni de las funciones de backend salvo logging adicional si hace falta para diagnosticar.
