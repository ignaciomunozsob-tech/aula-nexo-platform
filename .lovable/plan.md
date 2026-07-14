
## Objetivo

Corregir el flujo de login para que:
1. Los botones "Ingresar como creador" / "Ingresar como alumno" respeten la intención del usuario y redirijan a `/creator-app` o `/app`.
2. Google OAuth nunca cree cuentas duplicadas por email.
3. Si el usuario tiene ambos roles, se le pregunte con qué rol quiere entrar.

---

## 1. Intención de login (creador vs alumno)

**`src/components/layout/PublicNavbar.tsx`**
- Antes de navegar a `/login`, guardar en `localStorage`:
  - `novu:login_intent` = `"creator"` o `"student"`
- Mantener también `?next=/creator-app` o `?next=/app` como fallback.

**`src/pages/auth/LoginPage.tsx`**
- Después de un login exitoso (email/password), leer:
  1. Roles reales del usuario (nueva RPC `get_user_roles`, ver §3).
  2. `localStorage.novu:login_intent`.
  3. Query param `?next=`.
- Decidir destino:
  - Si el usuario tiene **ambos** roles (`creator` + `student`) → abrir modal "¿Cómo quieres entrar hoy?" (§4). No redirigir aún.
  - Si tiene solo `creator` (o `admin`) → mantener flujo 2FA existente y, al completar, redirigir a `/creator-app` (independiente del `intent`, porque no puede entrar como alumno si no lo es).
  - Si tiene solo `student` → redirigir a `/app`.
  - El `intent` solo desempata cuando hay ambos roles; en ese caso alimenta el modal como valor por defecto.
- `Verify2FAPage`: aceptar un `redirectTo` en `location.state` para respetar la elección del modal (por si el creador con ambos roles eligió "Como creador"; sigue yendo a 2FA → `/creator-app`).

**Google OAuth (`lovable.auth.signInWithOAuth`)**
- Mantener `redirect_uri: window.location.origin`.
- Cuando `onAuthStateChange` detecte sesión establecida vía OAuth y estemos en la raíz, ejecutar la misma lógica de decisión (roles + intent) y redirigir. Se hará en `src/lib/auth.tsx` con un efecto único post-hidratación, disparado solo si `login_intent` está presente en `localStorage` (para no interferir en navegación normal).
- Después de aplicar la decisión, borrar `novu:login_intent`.

---

## 2. Google OAuth: vincular por email, no duplicar

Supabase Auth ya deduplica por email cuando la opción "Link accounts with same email" está activa. La configuraremos y aseguraremos el trigger.

**Configuración de Auth (via `supabase--configure_auth` no aplica; setting específico se hace por SQL/config):**
- Confirmar en `auth.identities` que el proveedor Google se enlaza al `user_id` existente si el email coincide y está verificado.
- Como el trigger actual `handle_new_user` corre en `INSERT` de `auth.users`, un login Google con email existente no dispara el trigger de nuevo → no duplica profile ni role. Correcto.

**Endurecimiento defensivo (migración):**
- Añadir `UNIQUE` sobre `lower(email)` en `auth.users` no es posible (schema auth es managed). En su lugar:
  - Añadir función `public.link_google_identity_by_email()` invocada opcionalmente si detectamos colisión.
  - Actualizar `handle_new_user` para que, si ya existe un `profiles.id = NEW.id`, no falle (usar `ON CONFLICT (id) DO NOTHING`) y lo mismo con `user_roles`.
- Documentar en `mem://features/auth` que la unificación por email requiere que el usuario tenga email confirmado en la cuenta original.

---

## 3. Roles: nueva RPC para saber si tiene ambos

Migración nueva:

```sql
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role ORDER BY role), '{}')
  FROM public.user_roles WHERE user_id = _user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
```

Se usa en `LoginPage` y en el efecto post-OAuth de `auth.tsx`.

---

## 4. Modal "¿Cómo quieres entrar hoy?"

Nuevo componente `src/components/auth/RoleChoiceDialog.tsx`:
- Título: **"¿Cómo quieres entrar hoy?"**
- Botón primario amarillo: **"Como creador"** → dispara flujo 2FA y luego `/creator-app`.
- Botón outline: **"Como alumno"** → navega a `/app`.
- Preselecciona el `login_intent` guardado si existe.
- El modal se abre desde `LoginPage` cuando el usuario autenticado tiene ambos roles, y desde `auth.tsx` cuando la autenticación viene por Google y hay ambos roles.

---

## Archivos a modificar / crear

- `src/components/layout/PublicNavbar.tsx` — guardar `login_intent` antes de navegar.
- `src/pages/HomePage.tsx` — mismos CTAs si hay botones "Ingresar como…" en el hero (revisar y aplicar la misma lógica).
- `src/pages/auth/LoginPage.tsx` — decisión de redirect basada en roles + intent + next; abrir modal si ambos roles.
- `src/pages/auth/Verify2FAPage.tsx` — respetar `redirectTo` de `location.state`.
- `src/lib/auth.tsx` — efecto post-OAuth: leer intent, resolver roles, redirigir o abrir modal.
- `src/components/auth/RoleChoiceDialog.tsx` — **nuevo**.
- `supabase/migrations/<timestamp>_get_user_roles.sql` — nueva RPC + hardening de `handle_new_user` con `ON CONFLICT DO NOTHING`.

---

## Notas técnicas

- No tocamos `src/integrations/supabase/client.ts` (auto-generado); los tipos de la nueva RPC se regenerarán tras la migración.
- No se cambia el diseño global; el modal usa tokens de `index.css` (fondo card, botón `novu-btn-primary` amarillo).
- La configuración del consent screen de Google (nombre "NOVU") queda fuera de este plan — es acción manual en Google Cloud.
