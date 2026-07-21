## Objetivo

Que cada creador pueda tener **una página de pago personalizada marcada como "predeterminada" para un producto** (curso / evento / ebook / comunidad / sesión). Cuando cualquier visitante haga clic en "Inscribirse" o "Comprar" en la página pública del producto, si existe una página predeterminada publicada será redirigido a ella (para capturar nombre, correo, teléfono y ver el order bump). Si no hay ninguna marcada como predeterminada, sigue el flujo normal directo a MercadoPago.

## Cambios

### 1. Base de datos
- Agregar columna `is_default boolean NOT NULL DEFAULT false` a `checkout_pages`.
- Índice único parcial: solo una página predeterminada por `(creator_id, product_type, product_id)` cuando `is_default = true` y `is_published = true`.
- Actualizar la RPC `get_product_checkout_page` para devolver primero la marcada como `is_default = true` y publicada; si no hay, no devolver ninguna (así el flujo normal aplica).

### 2. Editor del creador (`CheckoutPagesPage` + `CheckoutPageEditorPage`)
- En el editor: switch "Usar como página de pago predeterminada de este producto". Al activarlo y guardar, se desmarca cualquier otra página del mismo producto y se fuerza `is_published = true`.
- En la lista: badge "Predeterminada" junto a las páginas marcadas y acción rápida "Marcar como predeterminada".

### 3. Flujo de compra público (`useMercadoPagoCheckout.startCheckout`)
- Antes de abrir el diálogo de invitado o llamar a MercadoPago, consultar `get_product_checkout_page`. Si devuelve una página predeterminada y no estamos ya en ella, redirigir a `/p/:creator_slug/:page_slug` (sin stash de datos, la página de pago recolecta todo).
- Aplica a usuarios logueados y a invitados, en `CourseDetailPage`, `EventDetailPage`, `EbookDetailPage`, `SessionBookingPage`, `CommunityPage` y `MarketplaceView` (todos usan el mismo hook, por lo que el cambio es central).
- Mantener el comportamiento actual del diálogo de invitado como fallback cuando no hay página predeterminada.

### 4. UX
- En `CheckoutPage.tsx` (la página pública de pago personalizada) mantener el soporte actual de `sessionStorage` para invitados que llegan desde otras vías, sin cambios adicionales.

## Detalles técnicos

- La migración solo agrega columna, índice y actualiza la función SQL — sin cambios en policies.
- La RPC `get_product_checkout_page` seguirá siendo `SECURITY DEFINER` y devolverá 0 o 1 fila; el frontend ya está preparado para ese contrato.
- El cambio en `useMercadoPagoCheckout` se hará al inicio de `startCheckout` para cubrir tanto usuarios logueados como invitados con una sola ruta de código.
