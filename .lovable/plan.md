## Limpieza de textos provisionales (MVP / Webpay / debug)

Encontré 5 textos visibles para el usuario que claramente son notas de desarrollo y deben eliminarse o reescribirse. No tocaré los badges "Próximamente" del Home y Precios porque son etiquetas legítimas de producto, ni los placeholders de formularios.

### Cambios

**1. `src/pages/creator/CreatorDashboard.tsx`**
- Línea 216 — Subtítulo del header. Reemplazar:
  > "Cursos + ventas (MVP). Luego sumamos payouts/retiros cuando metas Webpay."
  
  Por: "Resumen de tus cursos, ventas e ingresos."
- Línea 320 — Texto bajo "Ingresos". Reemplazar `Estimado (MVP)` por `Ingresos brutos del período`.
- Línea 370 — Eliminar el `<Badge variant="outline">MVP</Badge>` de la sección "Ventas recientes".
- Líneas 441-443 — Eliminar el párrafo:
  > "Próximo paso: agregar 'payouts/retiros' y separar 'saldo disponible' vs 'en tránsito'."

**2. `src/pages/auth/LoginPage.tsx`**
- Líneas 234-236 — Eliminar el párrafo de ayuda con `[LOGIN_ERROR]`:
  > "Si te sigue diciendo 'incorrectos', abre consola y mira [LOGIN_ERROR] para ver el motivo real."
  
  Se mantiene el `console.error("[LOGIN_ERROR]", error)` en línea 59 (solo para diagnóstico interno, no visible al usuario).

### Verificación
Tras los cambios, correré `rg -i "MVP|Webpay|LOGIN_ERROR|payouts/retiros" src/` para confirmar que no queda ninguna referencia visible.

### Fuera de alcance (no se tocan)
- Badges "Próximamente" de email marketing, dominio propio y comunidades de pago en HomePage, PreciosPage y CreatorCommunitiesPage — son features anunciadas, no notas de desarrollo.
- `console.error("[LOGIN_ERROR]", error)` interno en LoginPage.
