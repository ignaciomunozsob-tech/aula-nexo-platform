# Arreglar la página pública de los e-books

## Qué pasa (verificado)
Los e-books sí tienen página pública (`soynovu.cl/{creador}/{ebook}`) y el enlace los reconoce, pero la página muestra "Ebook no encontrado". La consulta pide los datos del e-book junto con los del creador en una sola petición, y la base de datos la rechaza porque el e-book no tiene un vínculo directo con el perfil del creador. Por eso siempre falla, también para visitantes sin cuenta.

## Qué se va a hacer
- Cargar primero el e-book (título, descripción, portada, precio) y después el nombre, foto y enlace del creador con la función pública que ya existe.
- Se mantienen el botón Comprar, el pixel de Meta (ViewContent) y la descarga protegida tal como están.
- Comprobar como visitante sin cuenta que la página de un e-book publicado se abre bien en computador y en móvil, y que funciona desde el perfil del creador.

## Detalles técnicos
- `src/pages/EbookDetailPage.tsx`: quitar el embed `profiles:creator_id(...)` del select y obtener el creador con `supabase.rpc('get_public_creators_by_ids', { _ids: [creator_id] })`.
- Sin cambios en la base de datos.
