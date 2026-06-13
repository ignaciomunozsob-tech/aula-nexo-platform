## Cosas que faltan o no concuerdan en la web

Revisé rutas, navegación, layouts, planes/comisiones, dashboards y edge functions. Estos son los huecos reales que encontré, agrupados por gravedad.

---

### 🔴 Inconsistencias graves (contradicciones visibles al usuario)

**1. La página `/precios` no concuerda con `/comisiones`**
- `/comisiones` dice rotundamente: "10% siempre, fijo, sin sorpresas, 90/10".
- `/precios` dice: Gratis = 10%, Creador = 5%, Pro = por definir.
- Un visitante que lea ambas verá dos políticas distintas.
- **Acción**: reescribir `ComisionesPage` para reflejar el modelo de 3 planes (o redirigir `/comisiones` → `/precios`). Actualizar el ejemplo "$10.000 → $9.000" para mostrar los tres escenarios.

**2. Los planes de `/precios` no se aplican en ningún lado**
- Se creó la tabla `creator_plans` y la RPC `get_my_plan()`, pero **ningún componente la consume**.
- El edge function `create-payment` cobra siempre `0.9 / 0.1` (hard-coded), ignorando el plan del creador.
- Un creador que "suba" al plan Creador (5%) seguiría pagando 10% real.
- **Acción**: leer `get_my_plan()` en `create-payment` y usar `(100 - comision) / 100` en lugar de `0.9`.

**3. El sidebar del creador no muestra ni enlaza al plan**
- `CreatorSidebar` no tiene item "Mi Plan" / "Suscripción".
- Tampoco hay nada en `CreatorDashboard` que indique el plan actual ni "Mejorar plan".
- **Acción**: agregar item "Mi Plan" en el sidebar → nueva página `/creator-app/plan` que muestre plan actual + CTA "Ver planes" (link a `/precios`).

**4. Restricciones de plan no implementadas** (pendiente del mensaje anterior)
- Aún no se bloquean: >2 cursos en Gratis, subida directa de video en Gratis, límite de tamaño de archivos, ni publicar curso con precio > 0 sin MercadoPago.

---

### 🟡 Rutas/páginas que faltan (mencionadas o esperables)

**5. Footer sin enlaces legales**
- El footer de `PublicLayout` solo enlaza Marketplace, Comisiones, Login, Signup. Falta:
  - `/precios` (existe pero no está en el footer)
  - `/terminos` (Términos y Condiciones) — **no existe la página**
  - `/privacidad` (Política de Privacidad) — **no existe la página**
  - `/contacto` o `/ayuda` — **no existe**
- Crítico para cobrar pagos y para Google/MercadoPago.

**6. Página pública para creadores ("Vender en NOVU")**
- El link existe (`/signup?role=creator`), pero no hay landing dedicada que explique beneficios + cuente la propuesta de valor antes de pedir registro. Hoy se mezcla todo en `HomePage`.

**7. `/precios` no está en el footer**
- Está solo en la navbar. Inconsistente con el resto de links del footer.

---

### 🟡 Concordancia entre páginas

**8. `HomePage` sigue mencionando "10% de comisión, 90% para ti"** (revisar y alinear con el nuevo modelo de 3 planes, o aclarar que es el plan Gratis).

**9. `CreatorFinancesPage` muestra "Comisión NOVU 10%"** hard-coded (asumido — verificar y parametrizar por plan).

**10. FAQ de `/precios` dice "se calcula sobre el precio total"** — consistente, pero `/comisiones` muestra un solo número fijo. Unificar el mensaje.

---

### 🟢 Otros huecos menores detectados

- **Ruta `/courses` vs `/marketplace`**: la navbar dice "Marketplace" pero apunta a `/courses`. No hay `/marketplace` real. Funciona, pero el slug es confuso.
- **`StudentSettings`** no permite cambiar contraseña ni eliminar cuenta (revisar).
- **`waitlist_pro`**: se guarda el email pero no hay panel admin para ver la lista.

---

## Propuesta de prioridades

Te propongo abordarlo en este orden (puedes elegir cuáles):

1. **Alinear `/comisiones` con `/precios`** (o redirigir) — elimina la contradicción más visible.
2. **Conectar `get_my_plan()` al edge function `create-payment`** — para que el plan tenga efecto real.
3. **Crear página `/creator-app/plan`** + item en sidebar — para que el creador vea/cambie su plan.
4. **Crear `/terminos` y `/privacidad`** + agregar al footer junto con `/precios`.
5. **Implementar restricciones de plan** (lo pendiente del mensaje anterior: >2 cursos, video directo, tamaño archivos).
6. Limpiar copy del Home y Finanzas para reflejar planes variables.

¿Por dónde empezamos? Puedo hacer 1+2+3 en una sola pasada (es lo más impactante), o ir uno a uno.