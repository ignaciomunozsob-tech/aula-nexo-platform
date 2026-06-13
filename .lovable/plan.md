## Resumen

Crear un sistema de **páginas de pago personalizadas** que el creador construye con bloques pre-armados, puede agregar **1 order bump opcional** (checkbox), y luego puede **embeber** el checkout en su propia landing vía `<iframe>`.

---

## 1. Modelo de datos (nueva migración)

### Tabla `checkout_pages`
- `id`, `creator_id` (fk profiles), `product_type` ('course'|'ebook'|'event'|'community'), `product_id` (uuid)
- `slug` (text, único por creador) — define la URL pública
- `is_published` (bool)
- `bump_product_type`, `bump_product_id`, `bump_discount_pct` (nullable) — order bump opcional
- `bump_headline` (text), `bump_description` (text)
- `blocks` (jsonb) — array ordenado de bloques con su config y `enabled`
- `theme` (jsonb) — colores, tipografía base
- `created_at`, `updated_at`

**Bloques fijos disponibles** (cada uno on/off + campos editables):
1. `hero` — imagen + título + subtítulo
2. `video` — embed YouTube/Vimeo
3. `benefits` — lista de bullets con íconos
4. `testimonials` — hasta 6 testimonios (nombre, foto, texto, rating)
5. `guarantee` — bloque de garantía con ícono
6. `faq` — preguntas y respuestas
7. `countdown` — temporizador con fecha límite
8. `summary` — resumen de compra (precio, bump, total) **siempre visible**
9. `checkout_button` — CTA al pago **siempre visible**

### RLS
- `SELECT` público cuando `is_published = true` (para mostrar la página y el embed)
- `INSERT/UPDATE/DELETE` solo si `creator_id = auth.uid()` o admin
- `GRANT SELECT` a `anon` y `authenticated`; `GRANT ALL` a `service_role`

### Cambios en `orders`
- Añadir columnas: `checkout_page_id` (fk), `bump_product_type`, `bump_product_id`, `bump_amount_clp`
- El monto total ya queda en `amount_clp` (producto + bump si aplica)

---

## 2. Edge functions

### `create-payment` (actualizar)
- Acepta `checkout_page_id` y `include_bump: boolean`
- Si `include_bump`, calcula precio del bump aplicando descuento desde DB (nunca confiar en el cliente), crea **una sola preferencia MercadoPago** con dos `items` (producto + bump)
- Guarda `bump_*` en `orders`

### `mercadopago-webhook` (actualizar)
- Al pagar, si hay bump → crear acceso al producto bump también (enrollment / order paid para ebook / event registration)

---

## 3. Frontend — creador

### `/creator-app/checkout-pages`
Listado de páginas con filtro por producto, botón "Nueva página".

### `/creator-app/checkout-pages/new` y `/:id/edit`
Editor en 3 paneles:
- **Izquierda**: lista de bloques con switch on/off y drag para reordenar (`@dnd-kit`)
- **Centro**: preview en vivo
- **Derecha**: panel de propiedades del bloque seleccionado

Sección aparte:
- **Producto principal** (selector)
- **Order bump** (selector de producto + headline + descripción + descuento %)
- **Slug** personalizable con validación de unicidad
- **Tema** (color principal, fondo)
- Botones: Guardar borrador / Publicar / Copiar URL pública / Copiar snippet embed

---

## 4. Frontend — página pública

### `/p/:creatorSlug/:checkoutSlug`
- Layout limpio sin la nav de NOVU (solo logo discreto de "Procesado por NOVU" en footer si free, ocultable en planes pagos a futuro)
- Renderiza los bloques en orden, con `summary` y `checkout_button` siempre presentes
- Checkbox del bump dentro del bloque `summary`
- Botón → llama a `create-payment` con `include_bump` actual → redirige a MercadoPago
- Dispara Meta Pixel (`ViewContent`, `InitiateCheckout`) global + pixel del creador

### `/embed/:creatorSlug/:checkoutSlug`
- Versión **minimalista** pensada para `<iframe>`: sin scroll lateral, alto auto, sin footer NOVU, listener `postMessage` para reportar alto al padre
- Headers: permitir embed (`X-Frame-Options: ALLOWALL` vía meta/respuesta) — al ser SPA en Hash Router basta con no setear `frame-ancestors`

### Snippet de embed (mostrado al creador)
```html
<iframe src="https://novu.cl/#/embed/:creator/:slug"
        style="width:100%;border:0;min-height:900px"
        id="novu-checkout"></iframe>
<script>
  window.addEventListener('message', e => {
    if (e.data?.type === 'novu:resize' && e.data.height)
      document.getElementById('novu-checkout').style.height = e.data.height + 'px';
  });
</script>
```

---

## 5. Integración con Meta Pixel
Reutilizar `metaPixel.ts`. La página pública y el embed disparan los mismos eventos que ya existen, usando `creator_pixel_id` del perfil del creador dueño de la página.

---

## 6. Entregables por orden de implementación

1. Migración DB (tabla `checkout_pages` + columnas en `orders` + RLS + GRANTs)
2. Edge function `create-payment` actualizada + webhook
3. Editor del creador (`CheckoutPagesPage`, `CheckoutPageEditor`) con bloques fijos
4. Página pública `/p/:creator/:slug`
5. Vista embed `/embed/:creator/:slug` con `postMessage` resize
6. UI para copiar URL y snippet embed
7. Entrada en el sidebar del creador

---

## Notas técnicas

- **Drag & drop**: `@dnd-kit/core` + `@dnd-kit/sortable` (ya soportado por el stack).
- **Sanitización**: todo texto rico de bloques pasa por `DOMPurify` (`src/lib/sanitize.ts`).
- **Bloques**: cada uno es un componente `<BlockHero />`, `<BlockTestimonials />`, etc. en `src/components/checkout-blocks/`. Renderer recibe el array `blocks` y mapea por `type`.
- **Seguridad bump**: el precio del bump se recalcula en `create-payment` desde la DB; el cliente solo envía `include_bump: boolean`.
- **Slug**: validar `^[a-z0-9-]{3,40}$`, único por `creator_id`.
- **Embed**: HashRouter ya hace que `/#/embed/...` funcione sin server config extra. `postMessage` con `ResizeObserver` sobre el `body`.

¿Lo apruebas y arranco con la migración?