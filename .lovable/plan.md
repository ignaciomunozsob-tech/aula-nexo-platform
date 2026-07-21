# Verificación de Meta Pixel en páginas de pago personalizadas

## Diagnóstico (verificado en vivo)

Probé la página de pago personalizada publicada `https://www.soynovu.cl/p/ignacio-munoz/meta-ads-taller` con Playwright, instrumentando `window.fbq` para capturar cada llamada al pixel.

Evidencia capturada durante la carga de la página:

```
fbq('init', '740501283914731')
fbq('trackSingle', '740501283914731', 'ViewContent', {
  value: 7000, currency: 'CLP',
  content_type: 'product', content_category: 'event',
  content_ids: ['be227c43-…'], content_name: '3 pasos para lanzar…'
})
```

Y Meta respondió con la petición `signals/config/740501283914731` desde `connect.facebook.net`, confirmando que el pixel del creador quedó inicializado en el dominio `soynovu.cl`.

## Cobertura actual del flujo personalizado

- **Entrada a `/p/:creator/:pageSlug`** → `ViewContent` con pixel del creador (`CheckoutPage.tsx`, useEffect línea 116-133), con guardián `useRef` para no duplicar.
- **Clic en "Comprar ahora"** → `InitiateCheckout` en pixel del creador y en pixel global NOVU (`useMercadoPagoCheckout.ts` líneas 46-47).
- **Redirección a `/compra-confirmada/{ref}`** → `Purchase` con `event_id = order.reference` (`PurchaseConfirmedPage.tsx`), deduplicado y marcado con `mark_order_pixel_fired`.
- **Webhook de MercadoPago (server-side)** → `Purchase` a Meta CAPI con el mismo `event_id`, PII hasheada (email/IP/UA) y `capi_fired=true`.

## Conclusión

No se requieren cambios: las páginas de pago personalizadas ya están totalmente instrumentadas con el pixel del creador y con CAPI. Cualquier compra por este flujo se registra igual que por el flujo estándar, e incluso si el comprador cierra el navegador antes de la página de confirmación, la venta llega a Meta por CAPI.

## Plan

- No hay archivos que modificar.
- Al aprobar este plan, no se ejecutará ningún cambio.
