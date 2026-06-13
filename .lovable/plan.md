# Bugs detectados al revisar la web

## 1. 🔴 Página pública de curso rota — "permission denied for function has_active_enrollment"

**Causa raíz:** las funciones `has_active_enrollment`, `has_role` e `is_course_creator` no tienen permiso `EXECUTE` para los roles `anon` y `authenticated`. La policy de SELECT en `lessons` llama a `has_active_enrollment(...)`, así que cualquier consulta pública que haga embed de lessons (como `course_modules → lessons` en `CourseDetailPage`) falla con 401 y rompe la página entera ("No pudimos cargar el curso").

Es el mismo patrón que rompería cualquier endpoint que dependa de esas policies (panel de creador, admin, enrollment checks, etc.) — por eso aparece como bug crítico aunque el origen sea sólo permisos.

## 2. 🟡 Carga lenta (HomePage, Marketplace, CourseDetail)

**Causa:** waterfall de queries secuenciales. En `CourseDetailPage`, por ejemplo:
1. `select courses`
2. `rpc get_public_creators_by_ids` (espera a 1)
3. `select course_modules + lessons` (espera a 2)
4. `rpc get_creator_pixel_id_by_id` (en useEffect, otro round-trip)

Cada paso suma latencia. Lo mismo en `HomePage` y `MarketplaceView`.

---

# Plan de arreglo

## A. Migración SQL — desbloquear las funciones usadas por RLS

```sql
GRANT EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_creator(uuid, uuid)     TO anon, authenticated;
```

Son `SECURITY DEFINER` con `search_path` fijado, así que es seguro exponerlas — sólo devuelven `boolean` sobre el `_user_id` pasado.

## B. Optimización de carga (sólo frontend, sin cambios de lógica)

1. **CourseDetailPage**: paralelizar con `Promise.all` la query de `course_modules` y el `rpc get_public_creators_by_ids` una vez que tengamos el `course`. Mover el pixel a la misma promesa.
2. **HomePage / MarketplaceView**: ya hacen 2 fetches (courses + creators rpc). Verificar que se disparen en paralelo y agregar `staleTime: 60_000` al `useQuery` para evitar refetch al volver a la home.
3. **CourseDetailPage**: agregar `staleTime: 30_000` para evitar refetch en navegaciones rápidas.

## C. Smoke test

Después de aplicar la migración:
- Abrir `/#/course/<slug>` sin sesión → debe renderizar curso + módulos.
- Abrir el mismo con sesión de student → idem.
- Verificar que el panel de creador siga viendo sus cursos (no debería cambiar, sólo abrimos EXECUTE).

---

# Detalles técnicos

- Archivos a editar: `src/pages/CourseDetailPage.tsx`, `src/pages/HomePage.tsx`, `src/components/marketplace/MarketplaceView.tsx`.
- Nueva migración: `supabase/migrations/<timestamp>_grant_rls_functions.sql`.
- No se tocan policies ni se cambian columnas expuestas — el modelo de privacidad sigue igual.
- No requiere cambios en edge functions ni en secrets.
