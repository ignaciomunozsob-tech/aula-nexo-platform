## Verificación en vivo del Meta Pixel por creador

Voy a comprobar en la app publicada que el Pixel del creador se inicializa y envía eventos correctamente en sus páginas públicas, ahora que las RPCs quedaron arregladas.

### Qué voy a hacer

1. Consultar en la base de datos qué creador(es) tienen un `meta_pixel_id` configurado y qué productos publicados tienen (curso / evento / ebook / sesión / perfil).
2. Abrir con un navegador headless (Playwright) las páginas públicas correspondientes en `https://www.soynovu.cl`:
   - Perfil del creador (`/:creator_slug`)
   - Detalle de curso, evento, ebook y/o sesión (los que existan publicados)
   - Checkout, si hay checkout page publicada
3. En cada página verificar:
   - Que se cargue el script `fbevents.js` de `connect.facebook.net`.
   - Que `window.fbq` esté definido y tenga el Pixel ID del creador entre los IDs inicializados.
   - Que se hayan disparado los eventos esperados (`PageView`, `ViewContent`).
4. Capturar screenshots + logs de red/console como evidencia y reportar el resultado.

### Sin cambios de código

Esta verificación es solo lectura: no toco archivos ni base de datos. Si algo falla, vuelvo con un plan de corrección antes de editar.

### Si no hay ningún creador con Pixel configurado todavía

Te aviso y te pido que configures uno de prueba en Creator App → Integraciones para poder validarlo end-to-end.