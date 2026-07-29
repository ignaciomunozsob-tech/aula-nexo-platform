## Problema

En el área del estudiante (`/app`), "Mis Productos" solo consulta cursos (`enrollments`) y eventos (`event_registrations`). Los e-books comprados y los agendamientos 1:1 nunca se consultan, por eso no aparecen. El dashboard inicial (`/app`) tampoco los muestra: solo lista cursos.

## Qué se va a construir

### 1. Mis Productos (`/app/my-courses`) — 4 pestañas
- **Cursos** (ya existe)
- **Eventos** (ya existe)
- **E-books** (nuevo): listar las compras pagadas de tipo e-book, con portada, título y botón **Descargar** que obtiene el archivo mediante la función segura ya existente (`get_ebook_file_url`) y abre el PDF firmado.
- **Agendamientos** (nuevo): listar las sesiones 1:1 reservadas usando la función existente `get_my_session_bookings`, con fecha/hora en horario de Chile, estado (confirmada/cancelada), enlace a Google Meet y opción de descargar el `.ics`.

Cada pestaña solo aparece si hay contenido; si no hay nada en ninguna, se mantiene el estado vacío actual con el botón al marketplace.

### 2. Dashboard del estudiante (`/app`)
- Reemplazar las tarjetas de métricas para reflejar todo lo adquirido: Cursos, Eventos, E-books, Sesiones.
- Añadir una sección **Compras recientes** unificada (curso / evento / e-book / sesión) ordenada por fecha, con enlace directo al recurso correspondiente.
- Corregir el filtro de inscripciones: hoy la consulta del dashboard no filtra por `user_id` y depende solo de RLS; se añadirá el filtro explícito.

### 3. Historial de compras
- Nueva pestaña o bloque **Todas mis compras** alimentado de `orders` (estado pagado) mostrando referencia `NOV-YYYY-XXXXX`, producto, monto y fecha, con enlace a la página de compra confirmada. Así el estudiante ve absolutamente todo lo pagado aunque el producto sea de un tipo nuevo en el futuro.

## Detalles técnicos

- E-books: consulta a `orders` filtrando `user_id = auth.uid()`, `product_type = 'ebook'`, `status = 'paid'`, y join manual a `ebooks` (id, title, cover_image_url, slug). La descarga usa `supabase.rpc('get_ebook_file_url', { _ebook_id })` y luego una URL firmada del bucket `protected-content`.
- Sesiones: `supabase.rpc('get_my_session_bookings')` (ya devuelve título, creador, fechas, `meet_url`, `ics_token`).
- Compras: `orders` con `select` de `reference, product_type, product_id, amount_clp, paid_at`, resolviendo títulos por tipo en el cliente.
- Se extrae la lógica de listados a componentes pequeños dentro de `src/pages/app/` para que `MyCoursesPage.tsx` no crezca demasiado.
- No se requieren cambios de base de datos: las RPCs y políticas necesarias ya existen. Si al probar aparece un permiso faltante para leer `ebooks`/`orders` desde el cliente, se añade una RPC de solo lectura equivalente.
