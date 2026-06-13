# Plan: Cerrar findings de seguridad restantes

## Objetivo
Eliminar los 2 findings reales (`checkout_pages` y `profiles`) restringiendo lo que ve el público a un subconjunto mínimo de columnas. Marcar como ignorados los 2 warnings genéricos del linter sobre SECURITY DEFINER (son false positives).

---

## 1. `checkout_pages` — restringir exposición pública

**Problema:** La policy pública expone todas las columnas (incluyendo `creator_id`, `product_id`, `bump_product_id`, `blocks` JSONB completo).

**Solución:**
- Eliminar la policy `"Public can view published checkout pages"`.
- Crear RPC `get_public_checkout_page(_slug text)` SECURITY DEFINER que devuelve solo:
  - `slug, title, theme, blocks` (sanitizado para no incluir IDs internos sensibles si los hubiera), `product_summary` (precio, título, imagen del producto principal), `bump_summary` (si aplica: título, precio, imagen).
- GRANT EXECUTE a `anon, authenticated`.
- Refactorizar el frontend de la página pública de checkout para llamar el RPC en vez de hacer `select * from checkout_pages`.

---

## 2. `profiles` — perfil de creador privado por defecto

**Decisión confirmada:** TODO el perfil queda privado. La vitrina pública solo expone el mínimo absoluto.

**Solución:**
- Eliminar la policy `"Creator profiles are publicly viewable"`.
- Mantener solo las policies privadas existentes (dueño + admin).
- Crear RPC `get_public_creator_profile(_slug text)` SECURITY DEFINER que:
  - Valida que el usuario tenga rol `creator` en `user_roles` (no en `profiles.role`).
  - Devuelve SOLO: `id, name, avatar_url, bio, creator_slug`.
  - NO expone: `intro_video_url`, `links`, `interests`, `meta_pixel_id`, `last_2fa_verified_at`, `onboarding_completed`, `role`, `email`, ni ninguna otra columna.
- GRANT EXECUTE a `anon, authenticated`.

**Impacto en UI pública (consciente):**
- La página pública del creador (`/c/{slug}`) ya **no mostrará** video de intro ni links sociales. Solo nombre, avatar, bio.
- `get_creator_pixel_id(slug)` se mantiene tal cual (ya es RPC y solo devuelve el pixel ID, que es público por naturaleza en Meta).

**Refactor de frontend:**
- Reemplazar todas las queries `from('profiles').select(...).eq('creator_slug', ...)` públicas por llamadas al RPC.
- Identificar todos los lugares afectados: página de creador, cards en marketplace/home, cards de cursos que muestran el nombre del creador.
- Para listados (cards de cursos en marketplace/home que necesitan nombre+avatar del creador), crear adicionalmente RPC `get_public_creators_by_ids(_ids uuid[])` que devuelve la misma lista mínima de columnas para múltiples creators a la vez.

---

## 3. Warnings genéricos del linter — ignorar

Los 2 warnings `SUPA_anon_security_definer_function_executable` y `SUPA_authenticated_security_definer_function_executable` son alertas genéricas que se disparan por **cualquier** función SECURITY DEFINER ejecutable. En este proyecto, todas las funciones SECURITY DEFINER expuestas validan permisos internamente (`auth.uid()`, `has_role`, ownership checks). Son intencionalmente públicas.

- Marcar ambos findings como **ignored** con explicación.
- Actualizar `security-memory` documentando que estos warnings son aceptados.

---

## Detalles técnicos (resumen)

**Migración SQL:**
1. `DROP POLICY` pública en `checkout_pages` y `profiles`.
2. `CREATE FUNCTION get_public_checkout_page(text)` SECURITY DEFINER.
3. `CREATE FUNCTION get_public_creator_profile(text)` SECURITY DEFINER, validando contra `user_roles`.
4. `CREATE FUNCTION get_public_creators_by_ids(uuid[])` SECURITY DEFINER.
5. `GRANT EXECUTE` de los 3 RPCs a `anon, authenticated`.

**Frontend:**
- Página pública de checkout: `supabase.rpc('get_public_checkout_page', { _slug })`.
- Página pública de creador: `supabase.rpc('get_public_creator_profile', { _slug })`.
- Listados con creator info: `supabase.rpc('get_public_creators_by_ids', { _ids })`.
- Quitar render de `intro_video_url` y `links` de la página pública del creador.

**Post-migración:**
- Re-correr el scan para confirmar que los 2 findings reales desaparecen.
- Ignorar los 2 warnings del linter + actualizar security memory.

---

## Lo que NO cambia
- Panel de creador logueado sigue viendo y editando todo su propio perfil (incluyendo intro_video_url, links).
- Admin sigue viendo todo.
- Lógica de pagos, pixel, auth, 2FA: sin cambios.
