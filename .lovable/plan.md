
# Plan: emails NOVU + migración sin planes + favicon

El dominio `notificaciones.soynovu.cl` ya está **verificado**, así que los emails saldrán inmediatamente al crearlos. Tres frentes en paralelo.

---

## 1. Favicon NOVU (bloqueado por imagen)

Necesito que subas el logo de NOVU como imagen cuadrada (PNG, idealmente 512×512). Cuando la tenga:
- Copio el archivo a `public/favicon.png` (y `apple-touch-icon.png` 180×180)
- Elimino `public/favicon.ico` actual (si existe) para que no lo sirva el navegador por defecto
- Actualizo `index.html`:
  - `<link rel="icon" href="/favicon.png" type="image/png">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`

Si prefieres que lo genere a partir del logo de la web (icono GraduationCap amarillo `#fcc70e` sobre fondo oscuro), lo creo con imagegen.

---

## 2. Emails transaccionales NOVU

### Templates nuevos (en `supabase/functions/_shared/transactional-email-templates/`)

1. **`creator-welcome.tsx`** — Bienvenida al creador
   - Asunto: "Bienvenido a NOVU"
   - Saludo personalizado, próximos pasos (completar perfil, conectar MercadoPago, crear primer producto)
   - CTA al panel `/creator-app`
   - Branding: fondo `#ffffff`, acento `#fcc70e`, Inter

2. **`admin-new-creator.tsx`** — Notificación a admin
   - Asunto: "Nuevo creador en NOVU: {name}"
   - Email, nombre, fecha
   - Destinatario fijo: `ignacio@raffamarketing.cl`

3. **`admin-new-sale.tsx`** — Notificación de venta
   - Asunto: "Nueva venta: {product} - ${amount} CLP"
   - Desglose: precio bruto, comisión 10% NOVU, add-on comunidad ($990 si aplica), neto al creador
   - Creador, comprador, producto

### Registry
- Actualizar `_shared/transactional-email-templates/registry.ts` con los 3 templates nuevos

### Triggers (sin crear nuevas edge functions — usar `send-transactional-email`)

- **Bienvenida creador + admin-new-creator**: invocar desde `SignupPage.tsx` tras `signUp` exitoso con `role=creator`. Dos `supabase.functions.invoke('send-transactional-email', ...)` con `idempotencyKey = user.id + '-welcome'` y `+'-admin-notify'`.
- **admin-new-sale**: invocar desde `supabase/functions/mercadopago-webhook/index.ts` justo después de marcar la orden como `paid`. `idempotencyKey = order.id + '-admin-sale'`.

### Deploy
- `send-transactional-email` ya está deployado, sólo redeploy tras editar templates/registry.
- Redeploy `mercadopago-webhook` para activar el trigger de venta.

---

## 3. Migración "sin planes"

### Migración SQL
- `DROP TRIGGER` y código de `enforce_course_publish_rules` (ya existe `enforce_course_publish_requires_mp` — confirmar que está aplicado a todos los productos)
- `DROP TABLE creator_plans, subscription_requests, waitlist_pro` (CASCADE)
- `DROP FUNCTION get_my_plan()` si existe
- `CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL)` con seeds: `commission_pct=10`, `community_fee_clp=990`, `max_installments=3`, `support_whatsapp`
  - GRANT SELECT a `authenticated`, GRANT ALL a `service_role`
  - RLS: lectura para todos los autenticados, escritura sólo admin (via `has_role`)

### Frontend creador
- `src/hooks/useMyPlan.ts` → hardcodear `{ plan: 'novu', comision: 10, isPro: true, isCreator: true }`, quitar llamadas a `get_my_plan`
- `src/components/creator/LockedFeature.tsx` → passthrough (siempre renderiza children)
- `src/components/layout/CreatorSidebar.tsx` → renombrar "Mi Plan" → "Mi cuenta", ruta `/creator-app/cuenta`
- `src/pages/creator/CreatorPlanPage.tsx` → reemplazar contenido con `CreatorAccountPage`: tabs (Datos personales, Facturación, Integraciones) reutilizando componentes existentes
- Agregar ruta `/creator-app/cuenta` en `App.tsx`, mantener `/creator-app/plan` redirigiendo

### Frontend público
- Eliminar (si existen) referencias a `/suscripcion/checkout`
- `PreciosPage.tsx` — verificar que ya está sin planes
- `TerminosPage.tsx` — actualizar sección 6 con texto del modelo único 10% + comunidad opcional

### Edge functions
- `create-payment` — fijar `commission_pct = 10` (ignorar `creator_plans.comision`)

### Fuera de alcance (confirmado en plan.md)
- No reembolsos automáticos del add-on de comunidad
- No migración retroactiva de ventas históricas
- No archivo de datos de `creator_plans` (se borra)

---

## Orden de ejecución

1. Migración SQL (requiere tu aprobación)
2. Templates + registry + redeploy `send-transactional-email`
3. Triggers en `SignupPage` y `mercadopago-webhook`
4. Frontend creador (useMyPlan, LockedFeature, Sidebar, CreatorAccountPage)
5. `create-payment` fix comisión
6. TerminosPage sección 6
7. Favicon (cuando subas la imagen)

---

## Confirmaciones antes de implementar

1. ¿Confirmas borrar `creator_plans`, `subscription_requests`, `waitlist_pro` (sin backup)?
2. ¿Email admin notificaciones → `ignacio@raffamarketing.cl`? ¿Otro adicional?
3. **Favicon**: ¿subes el logo NOVU o quieres que lo genere con imagegen (GraduationCap amarillo `#fcc70e` sobre fondo oscuro `#0a0a0a`)?
