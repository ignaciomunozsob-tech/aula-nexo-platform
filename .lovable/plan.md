## No hace falta re-subir nada

Ya construimos toda la infraestructura para migrar los 19 videos legacy **directamente desde el bucket de Lovable Cloud a Bunny**, sin que tengas que tocar los archivos. La edge function `bunny-migrate-lesson` descarga cada video con permisos de servicio y lo sube por API a tu Video Library de Bunny.

## Pasos (sin cambios de código)

1. Entrar a **`/admin/video-migration`** con tu cuenta admin.
2. Verás "Videos legacy detectados en la base: **19**". Click en **"Encolar todas"** → crea 19 jobs en estado `pending`.
3. Click en **"Iniciar migración"** → la página procesa uno por uno invocando `bunny-migrate-lesson`. Se muestra la barra `X de Y migrados`. **Deja la pestaña abierta** hasta que termine (el loop corre desde el navegador).
4. Por cada lección migrada, la base queda actualizada así:
   - `bunny_video_id` = id de Bunny
   - `video_source` = `bunny`
   - `bunny_status` = `processing` (pasa a `ready` cuando Bunny termina de codificar; el player ya sabe mostrar el spinner mientras tanto)
   - `video_url` reemplazado por la URL CDN de Bunny
5. Si alguno falla, aparece en "Errores" con el motivo. Botón **"Reintentar todas"** los vuelve a `pending`.
6. **Importante:** el archivo original en el bucket `protected-content` **NO se borra** durante la migración (rollback safety). El botón rojo **"Eliminar originales de Storage"** sólo se habilita cuando los 19 están en `done`, y ahí sí borra los archivos legacy en un solo paso.

## Consideraciones

- **Tiempo estimado:** cada video se descarga desde Storage y se sube a Bunny secuencialmente. Depende del tamaño total; para 19 lecciones típicas cuenta ~1-3 min por video.
- **Tras la migración, encoding en Bunny:** Bunny tarda unos minutos extra en generar las calidades HLS. Durante ese rato el player muestra "Tu video se está procesando…". No es necesario esperarlo para pasar a la siguiente lección.
- **Nada se pierde si algo sale mal:** los originales quedan en Storage hasta que tú decidas borrarlos manualmente.
- **YouTube/Vimeo y PDFs:** no se tocan.

## Fuera de alcance

Ningún archivo, edge function, ni tabla se modifica. Solo se ejecuta el flujo ya implementado.

## ¿Preguntas antes de ejecutar?

- ¿Confirmas que en Bunny ya tienes activado **Token Authentication** y el **Referrer allowlist** con `soynovu.cl`, `www.soynovu.cl` y el dominio de preview? Si no, los videos migrados podrían no reproducirse bien en producción.
- ¿Quieres que además, cuando termine todo, dispare automáticamente la limpieza de los originales, o prefieres apretar el botón manualmente cuando revises que todo se ve OK?