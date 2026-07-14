
## Diagnóstico del bug "inicié como creador y me mandó a alumno"

El listener `onAuthStateChange` en `src/lib/auth.tsx` (agregado en el turno anterior) dispara un `window.location.assign(...)` cuando encuentra `login_intent` en `localStorage`. Ese listener corre **también** durante el login por email/password en `/login`, y compite con la navegación de `LoginPage` hacia `/verify-2fa`. Resultado: pisa la ruta al `/verify-2fa` y manda a `/creator-app` o `/app` sin pasar por 2FA — y en algunos casos aterriza en `/app` porque el RPC de roles llega antes de que se hidrate el rol de creator.

### Fix

En `src/lib/auth.tsx`, restringir el redirect post-OAuth **solo** a `window.location.pathname === "/"` (que es donde vuelve Google). Excluir explícitamente `/login` y `/signup` — allí `LoginPage` es la única fuente de verdad.

---

## Dos formularios de login separados

### Rutas

- `/login/creator` → variante **creador** (acento amarillo, copy "Ingresar a tu cuenta de creador", ícono creador).
- `/login/student` → variante **alumno** (estilo estándar, copy "Ingresar a tu cuenta de alumno").
- `/login` se mantiene como fallback genérico (para links antiguos, password reset, etc.).

### Implementación

`src/pages/auth/LoginPage.tsx` acepta una prop `variant?: "creator" | "student" | "generic"` (default `"generic"`):

- Cabecera diferenciada:
  - **creator**: badge amarillo con texto "Modo creador", título "Ingresa a tu cuenta de creador", subtítulo "Accede a tu dashboard, ventas y comunidades".
  - **student**: título "Ingresa a tu cuenta de alumno", subtítulo "Continúa aprendiendo donde lo dejaste".
  - **generic**: título actual "Iniciar sesión".
- El botón principal en variante `creator` usa `novu-btn-primary` (amarillo); en `student` mantiene el `Button` estándar.
- En el pie: link "¿Buscas [la otra variante]?" que lleva a `/login/student` o `/login/creator`.
- Guardar `novu:login_intent` en `useEffect` según el `variant` (para que Google OAuth herede la intención sin depender del navbar).
- La lógica de redirect (roles + intent + modal si tiene ambos) queda igual — sigue funcionando por `LoginPage.routeAfterLogin`.

En `src/App.tsx` (router), añadir las dos nuevas rutas apuntando a componentes wrapper:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/login/creator" element={<LoginPage variant="creator" />} />
<Route path="/login/student" element={<LoginPage variant="student" />} />
```

### Navbar

`src/components/layout/PublicNavbar.tsx`: cambiar `studentLoginUrl` a `/login/student` y `creatorLoginUrl` a `/login/creator`. Mantener el `goLogin` que ya guarda intent en localStorage.

### Enlaces internos

- `src/pages/auth/SignupPage.tsx` (si tiene "¿Ya tienes cuenta? Inicia sesión") — mantener `/login` genérico salvo que la variante sea evidente.
- Los redirects de recuperación de contraseña siguen usando `/login` genérico.

---

## Archivos a modificar

- `src/lib/auth.tsx` — restringir redirect post-OAuth a `pathname === "/"`.
- `src/pages/auth/LoginPage.tsx` — aceptar prop `variant`, aplicar copy/estilo, guardar intent según variante.
- `src/App.tsx` — registrar rutas `/login/creator` y `/login/student`.
- `src/components/layout/PublicNavbar.tsx` — apuntar botones a las nuevas rutas.

No se toca la base de datos ni edge functions.
