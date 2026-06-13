## Plan: Actualizar sistema de planes y pagos NOVU

### 1. Página `/precios` (`src/pages/PreciosPage.tsx`)

**Precios actualizados (netos + IVA 19%):**
- Gratis: $0
- Creador: $14.990/mes (IVA → $17.838) · $149.900/año (IVA → $178.381)
- Pro: $27.990/mes (IVA → $33.308) · $279.900/año (IVA → $333.081)

**Cards de planes pagados:**
- Toggle "Mensual / Anual" en cada card
- En modo Anual: precio mensual equivalente + badge verde "2 meses gratis" + total anual debajo
- Siempre: "+ IVA (19%)" debajo del precio + línea pequeña gris "Total: $XX.XXX/mes con IVA"

**Features por plan** (reemplazar las actuales):
- Gratis: 2 cursos, video YouTube/Vimeo, 10MB, 10 alumnos manuales, stats básicas, soporte docs
- Creador: 10 cursos, video propio, 50MB, 10 alumnos manuales, cupones, email bienvenida, stats básicas, soporte WhatsApp, Agenda 1:1 (Próximamente)
- Pro: ilimitado, video propio, 200MB, alumnos ilimitados, cupones, email bienvenida, stats avanzadas, Pixel Meta, order bump, carritos abandonados, afiliados, comunidad por curso, Agenda 1:1 (Próximamente), soporte prioritario · comisión 2%

**Tabla comparativa:**
- Tres columnas con todas las features anteriores
- Columna Pro destacada: `border-2 border-[#fcc70e]`

### 2. Checkout de suscripción

Nueva ruta `/suscripcion/checkout?plan=creador|pro&ciclo=mensual|anual` → nueva página `src/pages/SubscripcionCheckoutPage.tsx`:
- Resumen del plan (nombre, neto, IVA 19%, total)
- Radio "¿Qué documento necesitas?" Boleta (default) / Factura
- Si Factura: campos RUT empresa, razón social, giro, dirección
- Texto gris: "El documento será emitido manualmente en un plazo de 24-48 horas hábiles"
- Métodos: MercadoPago (siempre) / Transferencia bancaria (solo Anual)
- Si transferencia: mostrar datos bancarios placeholder + instrucción de enviar comprobante
- Botón "Suscribirme" en cards de `/precios` enlaza a esta ruta con query params

Crear tabla `subscription_requests` para guardar la solicitud (plan, ciclo, método, doc, datos factura, status). MercadoPago de suscripción queda como TODO (por ahora marca el request `pending_payment` y redirige a un mensaje de "te contactaremos"; transferencia queda `pending_transfer`).

### 3. Features bloqueadas en panel creador

**Hook `useMyPlan.ts`** (extender):
```ts
interface PlanLimits {
  plan, comision, planLabel,
  maxCourses, allowDirectVideo, maxFileMB, maxManualStudents,
  allowCoupons, allowWelcomeEmail, allowAdvancedStats,
  allowMetaPixel, allowOrderBump, allowAbandonedCart,
  allowAffiliates, allowCommunityPerCourse,
}
```
Limits actualizados:
- Gratis: 2 cursos, no video directo, 10MB, 10 alumnos, todo lo demás false
- Creador: 10 cursos, video directo, 50MB, 10 alumnos, cupones+email true, resto false
- Pro: ilimitado, video, 200MB, alumnos ilimitados, todo true, comisión 2%

**Nuevo componente `src/components/creator/LockedFeature.tsx`:**
- Wrapper que muestra candado 🔒 y al click abre modal
- Props: `requires: 'creador' | 'pro' | 'coming-soon'`, `children`
- Modal con: título, subtítulo según caso, botón amarillo "Ver plan X →" → `/precios`, botón outline "Ahora no" / "Entendido"
- `rounded-2xl` (border-radius 16px), fondo card, sombra

**Aplicar en panel creador** donde correspondan las features bloqueadas:
- `CheckoutPageEditorPage` → bloquear order bump si !allowOrderBump
- `CreatorProfileEdit` → Pixel Meta bloqueado si !allowMetaPixel
- `CourseEditorPage` → cupones, email bienvenida, comunidad por curso
- `CreatorFinancesPage` o sidebar → afiliados, carritos abandonados, stats avanzadas como secciones bloqueadas
- `CreatorSidebar` → ítems "Afiliados", "Carritos", "Agenda 1:1" con badge 🔒 o "Próximamente"

### 4. DB migration

- Extender `creator_plans.plan` para aceptar `'gratis' | 'creador' | 'pro'` (ya soportado)
- Crear `subscription_requests` (id, creator_id, plan, ciclo, metodo, documento, rut/razon/giro/direccion, status, created_at, updated_at)
- Actualizar trigger `enforce_course_publish_rules` con nuevos límites por plan (2/10/ilimitado)

### Archivos a tocar

- `src/pages/PreciosPage.tsx` (rewrite)
- `src/pages/SubscripcionCheckoutPage.tsx` (nuevo)
- `src/App.tsx` (ruta nueva)
- `src/hooks/useMyPlan.ts` (extender limits)
- `src/components/creator/LockedFeature.tsx` (nuevo)
- `src/components/layout/LessonVideoUploader.tsx` (usar nuevos límites + LockedFeature)
- `src/components/layout/CreatorSidebar.tsx` (badges 🔒 / Próximamente)
- `src/pages/creator/CheckoutPageEditorPage.tsx` (bloquear order bump)
- `src/pages/creator/CreatorProfileEdit.tsx` (bloquear pixel)
- `src/pages/creator/CourseEditorPage.tsx` (bloquear cupones, email, comunidad)
- Migration: nueva tabla + trigger actualizado

### Fuera de alcance (confirmar)

- Integración real de pagos recurrentes MercadoPago para suscripciones queda como flujo manual (transferencia/MP con activación manual del plan por admin) — la activación automática se puede agregar después.
- Datos bancarios reales para transferencia → usar placeholders hasta que me los pases.
