
# Plan: NOVU — checkout y páginas más rápidas y sin bugs

Objetivo: que un visitante que llega por primera vez a NOVU pueda ver el producto, pagar y recibir acceso sin fricción, y que el pixel registre limpio.

## 1. Páginas públicas cargan rápido en la primera visita

**Diagnóstico**: `src/App.tsx` importa **~60 páginas de forma eager** (Home, Courses, Course/Event/Ebook/Session, Checkout, todo el panel de creador, admin, community, auth, etc.). Todo eso viaja en el bundle inicial. En la primera visita al dominio o al segundo click, el navegador todavía está descargando/parseando JS que no necesita, y por eso las páginas de producto "no cargan bien" en la primera o segunda visita.

**Cambios**:
- Convertir todas las rutas de panel (creador, admin, student app, community) y las rutas menos usadas (`TerminosPage`, `PrivacidadPage`, `UnsubscribePage`, `TrustPage`, `DebugPage`, `PreciosPage`, `ComisionesPage`) a `React.lazy(...)` + `<Suspense>` con un fallback consistente.
- Mantener eager sólo las rutas críticas del funnel público: `HomePage`, `ProductResolverPage`, `CourseDetailPage`, `EventDetailPage`, `EbookDetailPage`, `SessionBookingPage`, `CheckoutPage`, `PaymentResultPage`, `LoginPage`, `SignupPage`.
- Configurar `QueryClient` con `staleTime: 60_000`, `gcTime: 5*60_000`, `refetchOnWindowFocus: false` para que abrir/cerrar la pestaña no dispare refetches innecesarios y páginas revisitadas se pinten al instante.

## 2. MercadoPago responde más rápido tras enviar los datos

**Diagnóstico**: el backend `create-payment` ya está paralelizado (turno anterior). Lo que queda de fricción está en el frontend:
- El `useMercadoPagoCheckout` recién marca `loading=true` cuando arranca `doCheckout`, no cuando el usuario aprieta "Pagar" en el diálogo de invitado → el diálogo se ve "muerto" un instante.
- No hay prefetch del edge function: la primera invocación paga el cold start del contenedor.

**Cambios**:
- En `useMercadoPagoCheckout`: setear `loading=true` **antes** de cerrar el `GuestCheckoutDialog`, y mantenerlo hasta el `window.location.href = url`. Deshabilitar el botón "Pagar" del diálogo durante todo el trayecto.
- Mostrar un mensaje visible "Conectando con MercadoPago…" con `Loader2` en el botón, y cambiar el cursor a `wait` en `body` para dar feedback continuo.
- En `CheckoutPage`, `CourseDetailPage`, `EventDetailPage`, `EbookDetailPage`, `SessionBookingPage`: precargar (`<link rel="preconnect">`) `api.mercadopago.com` y `www.mercadopago.cl` en el `<head>` cuando el precio > 0, así el redirect encuentra la conexión TLS lista.
- Manejo de error `creator_not_connected` (409): mostrar un toast claro "Este creador aún no ha conectado su cuenta de pagos", en lugar del genérico.

## 3. Guest checkout no vuelve a fallar

**Cambios**:
- Validación de teléfono opcional pero, si viene, normalizar a solo dígitos + `+`.
- Si `find_user_id_by_email` devuelve un id existente, respetar `guest_name`/`guest_phone` **solo** para el registro de la orden, no sobrescribir el perfil del usuario ya creado (hoy `create-payment` los guarda en columnas de `orders` pero no toca `profiles`, verificar que siga así).
- Después del redirect a MP: al volver a `/payment/success`, si el usuario fue creado como invitado (`is_new_user = true`), disparar el email transaccional "creator‑welcome"/"student‑welcome" con instrucciones para setear contraseña (magic link). Verificar que este flujo hoy no dependa de un login previo del usuario.

## 4. Post-compra impecable

**Diagnóstico**: el webhook de MercadoPago (`mercadopago-webhook`) es quien crea `enrollments` / `event_registrations` / entrega el ebook. Hay que revisar que sea idempotente y que se dispare aun cuando el usuario cierre la pestaña antes del redirect de éxito.

**Cambios (auditoría, sin refactor grande)**:
- Confirmar que el webhook use `external_reference = order.id` y actualice `orders.status = paid` una sola vez (UPSERT o guard).
- Confirmar que el email de compra al alumno + email a NOVU/creador se disparen dentro del webhook, no en el redirect.
- `PaymentResultPage /success`: si `order.status` ≠ `paid` todavía (webhook en camino), hacer polling suave (2s x 5) antes de mostrar "revisa tu email".
- Si `orders.metadata.product_url` existe, usarlo como link "Volver al producto" desde `/payment/failure`.

## 5. Meta Pixel limpio

**Diagnóstico**: ya se agregó el guard con `useRef` para `ViewContent`. Falta:
- `MetaPixelTracker` se monta en `<App>` y dispara `PageView` en cada cambio de ruta con **todos** los pixels inicializados. En páginas de producto, además, el pixel del creador se inicializa. Hay que verificar que no se dispare `PageView` dos veces (una del NOVU global, otra del creador) o que se acepte como comportamiento esperado.

**Cambios**:
- Revisar `MetaPixelTracker` y `usePageView` para asegurar que `PageView` se dispara una sola vez por ruta y por pixel (con `useRef` o comparación del pathname anterior).
- Documentar en el helper `metaPixel.ts` la diferencia entre `trackEvent` (todos) y `trackEventFor` (uno) para futuros contribuyentes.

## Detalles técnicos

**Archivos a editar**:
- `src/App.tsx` — lazy loading + QueryClient config.
- `src/hooks/useMercadoPagoCheckout.ts` — orden del `loading`, mensajes.
- `src/components/checkout/GuestCheckoutDialog.tsx` — estado bloqueado durante submit.
- `src/pages/CheckoutPage.tsx` + `Course/Event/Ebook/Session` detail — `<link rel="preconnect">` MP.
- `src/pages/PaymentResultPage.tsx` — polling suave + fallback `product_url`.
- `src/components/MetaPixelTracker.tsx` / `src/hooks/usePageView.ts` — dedupe `PageView`.
- `supabase/functions/mercadopago-webhook/index.ts` — solo auditoría, cambios mínimos si detectamos no-idempotencia o falta de emails.

**Fuera de alcance en este plan** (avisar si aparecen):
- Rediseño visual de la página de checkout.
- Cambios de RLS o migraciones (todas las de esta sesión ya fueron aplicadas).
- Nuevos métodos de pago.

## Orden de implementación

```text
1) Lazy routes + QueryClient config      → notable en 1ª/2ª visita
2) Feedback inmediato en checkout        → percepción de velocidad MP
3) preconnect a MercadoPago              → tiempo real de redirect
4) Guest post-compra + polling success   → cero "no recibí nada"
5) Auditoría webhook + pixel dedupe      → cerrar loose ends
```

Cada paso es independiente y se puede desplegar sin bloquear al siguiente.
