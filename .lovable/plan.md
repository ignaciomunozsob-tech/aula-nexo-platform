
# Migración al modelo sin planes

Cambio coordinado para eliminar el sistema de planes/trials y dejar el modelo único: NOVU cobra 10% por venta, sin mensualidad, add-on opcional de comunidad ($990 por venta).

## 1. Base de datos (1 migración)

- Eliminar trigger `enforce_course_publish_rules` (la lógica de límite de cursos por plan).
- Reemplazar por un trigger nuevo `enforce_course_publish_requires_mp` que sólo valida la conexión MercadoPago cuando se publica un producto con precio (sin chequear plan).
- Eliminar la columna/tabla `creator_plans` y la función `get_my_plan()` (o dejar `get_my_plan` retornando siempre `plan='novu'`, `comision=10` para no romper código en transición — preferimos eliminar).
- Eliminar la tabla `subscription_requests` y `waitlist_pro`.
- Agregar `app_settings` (tabla key/value) con defaults: `commission_pct=10`, `community_fee_clp=990`, `max_installments=3`, `support_whatsapp=https://wa.me/56933728004`. Sólo lectura para `authenticated`, escritura para admin.

## 2. Edge functions

- `create-payment`: ya descuenta `community_fee_clp` si el curso lo tiene activo. Actualizar para:
  - Comisión siempre 10% (ignorar `creator_plans.comision`).
  - Quitar cualquier branch que cobre planes.
- `mercadopago-webhook`: al marcar la orden como `paid`, invocar las nuevas notificaciones por email (venta al admin + bienvenida si aplica). Sin cambios a comisión.
- Crear/actualizar email templates:
  - `creator-welcome` (al registrarse, ya disparado por `handle_new_user` vía hook que ya tenemos para auth — o por una función nueva `notify-new-creator` llamada desde el SignupPage; usaremos el envío transaccional con `send-transactional-email`).
  - `admin-new-creator` (a `ignacio@raffamarketing.cl`).
  - `admin-new-sale` (con desglose 10% + comunidad).
- Eliminar funciones de cobro de suscripción si existen (no veo `subscription-*` en el árbol, sólo página de checkout — la quitamos del frontend).

## 3. Frontend creador

- **Sidebar** (`CreatorSidebar.tsx`): renombrar "Mi Plan" → "Mi cuenta" y apuntar a `/creator-app/cuenta`.
- **`CreatorPlanPage` → `CreatorAccountPage`**: nueva página simplificada con perfil, fecha de registro, total vendido, comisión pagada, botones editar perfil / cambiar contraseña. Conservar internamente las sub-vistas de Billing e Integrations pero accesibles desde Mi Cuenta como tabs (Datos personales, Datos de facturación, Integraciones).
- **`LockedFeature.tsx`**: convertir en passthrough (siempre renderiza children). Conservar el componente para no romper imports.
- **`useMyPlan.ts`**: hardcodear `{ plan: 'novu', comision: 10, isPro: true, isCreator: true }` para que todas las features pasen sus checks. Eliminar las llamadas a `get_my_plan`.
- **`CourseEditorPage`**: el toggle de comunidad ya existe; mantener.
- **`CreatorFinancesPage`**: el desglose por venta debe mostrar Precio / Comisión 10% / Comunidad / Total. Confirmar que el desglose por orden listado lo refleja.

## 4. Frontend admin

- `/admin/creadores` (`AdminInstructorsPage`): quitar columnas plan/comisión y acciones de plan. Agregar columnas "Ventas totales" y "Comisión pagada" (suma agregada por creador).
- `/admin/ventas` (`AdminDashboard` o vista correspondiente): agregar columna "Comunidad" ($990 o $0) y métrica "Ingresos por comunidades este mes".
- `/admin/configuracion`: limitar a comisión por venta, cargo comunidad, máx. cuotas, link WhatsApp (lee/escribe `app_settings`).

## 5. Páginas públicas

- Eliminar ruta `/suscripcion/checkout` y `SubscripcionCheckoutPage.tsx`.
- Borrar referencias a planes en `MiPlanPage` viejo, signup flujo "creador" (sin selección de plan).
- `TerminosPage`: reescribir sección 6 con el texto del prompt.

## 6. Emails

- Borrar templates de trial/renovación/pago fallido (si existen en `_shared/transactional-email-templates/`).
- Crear/actualizar: `creator-welcome.tsx`, `admin-new-creator.tsx`, `admin-new-sale.tsx` con los textos del prompt.
- Trigger de bienvenida creador: invocar `send-transactional-email` desde `SignupPage` cuando `role=creator` (idempotency key = user.id).
- Trigger admin-new-creator: misma invocación en SignupPage (segundo invoke).
- Trigger admin-new-sale: invocar desde `mercadopago-webhook` después de marcar `paid`.
- Requiere: infraestructura de emails ya inicializada (`setup_email_infra` + `scaffold_transactional_email`). Si no está, lo levantamos en este mismo deploy.

## 7. Detalles técnicos

```text
DB
├─ DROP TRIGGER enforce_course_publish_rules
├─ CREATE TRIGGER enforce_course_publish_requires_mp (solo MP check)
├─ DROP TABLE creator_plans, subscription_requests, waitlist_pro
├─ DROP FUNCTION get_my_plan
└─ CREATE TABLE app_settings (key text PK, value jsonb)

Edge
├─ create-payment: commission_pct=10 fijo
├─ mercadopago-webhook: dispara admin-new-sale email
└─ send-transactional-email (existente o nuevo)

Front creador
├─ Sidebar: Mi cuenta
├─ CreatorAccountPage (nueva, reemplaza CreatorPlanPage)
├─ useMyPlan: hardcoded novu
└─ LockedFeature: passthrough

Front admin
├─ AdminInstructorsPage: nuevas columnas
├─ AdminDashboard /ventas: columna Comunidad + métrica
└─ AdminSettings: solo 4 campos

Públicas
├─ ELIMINAR /suscripcion/checkout
├─ ELIMINAR PreciosPage menciones de planes (ya rehecho)
└─ TerminosPage sección 6
```

## Fuera de alcance

- Reembolsos automáticos del add-on de comunidad si se desactiva.
- Migración retroactiva de ventas históricas (la columna `community_fee_clp` queda 0 para ventas previas).
- Migración de datos de `creator_plans` a otro destino (se borra; no se usa más).
- Cambio de visual/branding (la UI sólo cambia donde se mencionan los textos).

## Preguntas antes de implementar

1. **¿Confirmas borrar la tabla `creator_plans` y `subscription_requests`?** Pierde el histórico de planes anteriores. Alternativa: dejarlas como archivo de solo lectura.
2. **Bienvenida al creador**: ¿OK enviarla desde el cliente (`SignupPage` tras signup exitoso) o prefieres una función nueva `notify-new-creator` invocada por webhook?
3. **Email infraestructura**: si todavía no está configurada en este proyecto, ¿avanzo con el setup (requiere completar el diálogo de dominio de email)?

Si las tres respuestas son "sí, dale", procedo sin más preguntas.
