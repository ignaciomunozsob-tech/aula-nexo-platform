# Fix: Meta Pixel product_id legible para conversiones personalizadas

## Diagnóstico

El error `#1885014 — combinación no válida de parámetros` ocurre porque Meta espera que `content_type` sea uno de los valores estándar (`product` o `product_group`) cuando se hacen conversiones personalizadas basadas en `content_ids` / `product_id`. Actualmente NOVU envía `content_type: 'course' | 'ebook' | 'event' | 'session'`, valores que Meta no reconoce como catálogo y por eso rechaza el objeto promocionado.

`PurchaseConfirmedPage` ya usa correctamente `content_type: 'product'`; el resto de los eventos (ViewContent, InitiateCheckout, Purchase legacy) no.

## Cambios (solo frontend / Pixel)

Reemplazar en todos los `trackEvent` / `trackEventFor` este patrón:

Antes:
```
content_type: 'course',           // o 'ebook' | 'event' | 'session' | page.product_type
content_ids: [productId],
```

Después:
```
content_type: 'product',
content_ids: [productId],         // el UUID sigue siendo el product_id que ve el creador
content_category: 'course',       // el tipo real de NOVU, para segmentar sin romper Meta
content_name: <title>,            // ya está en varios, uniformar
```

Así `content_ids` = `product_id` sigue siendo el mismo UUID que se muestra en el panel del creador (`ProductIdCell`) y que se guarda en `orders.product_id`, pero Meta ya lo acepta como catálogo válido y las conversiones personalizadas por `product_id` (Custom Conversions → URL/Event Parameter → `content_ids` contains `<uuid>`) empiezan a matchear.

### Archivos a editar

1. `src/pages/CheckoutPage.tsx` — ViewContent: `content_type: 'product'`, mover `page.product_type` a `content_category`.
2. `src/hooks/useMercadoPagoCheckout.ts` — InitiateCheckout: idem.
3. `src/pages/CourseDetailPage.tsx` — ViewContent: idem (`'course'` → category).
4. `src/pages/EbookDetailPage.tsx` — idem.
5. `src/pages/EventDetailPage.tsx` — idem.
6. `src/pages/SessionBookingPage.tsx` — idem.
7. `src/pages/PaymentResultPage.tsx` — Purchase legacy: idem (usa `order.product_type`).
8. `src/pages/PurchaseConfirmedPage.tsx` — ya está en `'product'`; agregar `content_category` con el tipo real para consistencia.

### Bonus de diagnóstico para el creador

En `CreatorIntegrationsPage.tsx`, agregar una nota corta bajo la descripción del Meta Pixel indicando que para crear una **Conversión personalizada** en Meta debe filtrar por `content_ids` (no por `content_type`) y pegar el `product_id` visible en su tabla de productos. Sin cambios de lógica, solo copy.

## Fuera de alcance

- No se toca backend, edge functions, `orders`, ni el `product_id` en sí.
- No se cambia la lógica de qué pixel dispara (global vs creador).
- No se agregan eventos nuevos.

## Verificación

1. Preview → abrir producto → Meta Pixel Helper debe mostrar ViewContent con `content_type=product` y `content_ids=[<uuid>]`.
2. Iniciar checkout → InitiateCheckout con los mismos parámetros.
3. Completar compra de prueba → Purchase con `content_type=product` + `value` + `currency=CLP`.
4. En Meta Events Manager → Conversiones personalizadas → crear una con regla `content_ids contains <product_id>` y confirmar que Meta ya no devuelve #1885014.
