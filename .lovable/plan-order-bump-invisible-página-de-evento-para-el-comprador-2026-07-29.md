# Order bump invisible + página de evento para el comprador

## Qué está pasando (verificado)

En la base de datos hay órdenes pagadas donde el producto principal es un **evento** y el order bump es un **e-book** (`bump_product_type = 'ebook'`). El acceso sí se entrega en el webhook, pero:

- La consulta de "Mis E-books" del estudiante solo mira `product_type = 'ebook'` de la orden, nunca el campo del bump → el e-book comprado como bump no aparece.
- La función de descarga segura (`get_ebook_file_url`) también valida solo contra `product_type = 'ebook'`, así que aunque apareciera, la descarga sería denegada.
- En "Compras" cada orden se muestra como **una sola línea**, así que el bump queda escondido dentro del monto total.

Además, los eventos comprados hoy no tienen página propia: en "Mis Productos" son una tarjeta sin enlace y en el dashboard llevan a la lista general; el único detalle que existe es la página de compra confirmada.

## Qué se va a construir

### 1. El order bump se ve y se descarga
- Incluir los productos comprados como bump en la biblioteca del estudiante: e-books, eventos, cursos y comunidades del campo bump se tratan igual que el producto principal.
- Permitir la descarga del e-book comprado como bump (ajuste en la validación de acceso al archivo).
- Los productos por bump también aparecen en la grilla del dashboard con su etiqueta de tipo correspondiente.

### 2. Las compras con bump se muestran como dos líneas separadas
En la pestaña **Compras**, una orden con bump genera dos filas:
- Producto principal, con el monto sin el bump.
- Producto del bump, con su propio monto, misma referencia y un distintivo "Order bump" para que se entienda que vino en la misma transacción.

Cada fila muestra el nombre y el tipo real del producto (Evento, E-book, Curso), no la etiqueta genérica "Producto".

### 3. Página del evento para el comprador
Nueva ruta `/app/event/:eventId` (solo para quien está inscrito) con:
- Portada, título y descripción del evento.
- Fecha y hora en horario de Chile, duración y cuenta regresiva / estado (próximo, en curso, finalizado).
- Si es **online**: enlace de acceso (Meet/Zoom/etc.) mostrado solo a inscritos.
- Si es **presencial**: dirección con botón "Ver en Google Maps".
- Enlace de redirección del evento con detección automática del destino: si es WhatsApp muestra "Unirse al grupo de WhatsApp" con su ícono, si es Telegram/Zoom/Meet/otro se etiqueta igual, y en cualquier otro caso "Ir al enlace del evento".
- Botón para agregar al calendario.

Se enlaza desde: tarjeta de evento en "Mis Productos", grilla del dashboard, y el botón de acceso de la página de compra confirmada cuando el producto es un evento (en vez de quedarse en la confirmación).

## Detalles técnicos

- `useStudentLibrary`: las consultas de e-books y de órdenes pasan a considerar `bump_product_type` / `bump_product_id` / `bump_amount_clp`, generando ítems "expandidos" por orden.
- Migración: `get_ebook_file_url` acepta también órdenes pagadas donde `bump_product_type = 'ebook'` y `bump_product_id = _ebook_id`.
- Nueva RPC `get_my_event_details(_event_id)` (security definer) que devuelve título, descripción, portada, fecha, duración, tipo, `location`, `meeting_url` y `redirect_url` solo si el usuario está inscrito, es el creador o es admin — así no se expone la URL de acceso públicamente.
- Página nueva `src/pages/app/StudentEventPage.tsx` + ruta lazy dentro del layout de estudiante; helper de detección de tipo de enlace en `src/lib/` (whatsapp / telegram / zoom / meet / genérico).
- Reutiliza los skeletons existentes para la carga.
- No se toca la lógica de cobro ni el webhook: el acceso ya se entrega correctamente, el problema era de visibilidad y permisos de lectura.
