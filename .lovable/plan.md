# Plan de implementación — NOVU (deploy único)

Cambios solicitados; nada más se toca.

---

## 1. Sidebar panel creador (reorganización)

Nueva estructura en `src/components/layout/CreatorSidebar.tsx`:

1. Dashboard → `/creator-app`
2. Mis Productos → `/creator-app/products`
3. Reservas → `/creator-app/bookings` (tabs internos: **Calendario · Disponibilidad default**)
4. Finanzas → `/creator-app/finances`
5. Mi Perfil Público → `/creator-app/profile`
6. Mi Plan → `/creator-app/plan` (tabs internos: **Plan · Facturación · Integraciones**)

Reubicaciones (rutas viejas se conservan como redirects para no romper links):
- Disponibilidad default → tab dentro de Reservas (reusa `CreatorAvailabilityPage`)
- Páginas de pago → entra a un producto (curso) → tab "Páginas de pago" en el editor
- Datos de facturación → tab en Mi Plan (reusa `CreatorBillingPage`)
- Integraciones → tab en Mi Plan (reusa `CreatorIntegrationsPage`)
- Evaluaciones (reviews) → tab dentro de cada curso en su editor
- Comunidades → tab dentro de cada curso en su editor, con `LockedFeature` si plan ≠ Pro

Ningún componente se borra; solo cambia dónde se monta y se quitan entradas del sidebar.

---

## 2. Vista alumno del curso (`CoursePlayerPage`)

Rediseñar `src/pages/app/CoursePlayerPage.tsx`:

**Sidebar izquierdo del curso** (componente nuevo `CourseSidebar`):
- Título del curso
- Barra de progreso (% completado)
- Lista de módulos colapsables con sus lecciones (ícono check si completada)
- Item final **Comunidad** (solo si `courses.community_enabled = true` para ese curso)

**Área principal — modo lección:**
- Player (ya existe)
- Título + descripción
- Recursos del módulo (lista descargable desde `lesson_resources` por módulo — ver §5)
- Botón "Marcar como completada"

**Área principal — modo comunidad:**
- Render del feed del curso (componente `CourseCommunityFeed`)
- El sidebar permanece visible

Ruteo interno: query `?view=community` o `?lesson=<id>` (sin cambiar la ruta principal).

---

## 3. Comunidad por curso

### Schema (migración)
```sql
ALTER TABLE public.courses
  ADD COLUMN community_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN community_fee_clp integer NOT NULL DEFAULT 990;

CREATE TABLE public.course_community_posts (
  id uuid pk, course_id uuid, author_id uuid,
  body text, image_url text, pinned boolean default false,
  created_at, updated_at);

CREATE TABLE public.course_community_replies (
  id uuid pk, post_id uuid, author_id uuid, body text, created_at);

CREATE TABLE public.course_community_reactions (
  id uuid pk, post_id uuid, user_id uuid, created_at,
  unique(post_id, user_id));

CREATE TABLE public.course_community_bans (
  id uuid pk, course_id uuid, user_id uuid,
  banned_by uuid, reason text, created_at,
  unique(course_id, user_id));
```
+ GRANTs a `authenticated` y `service_role`, RLS y policies:
- SELECT posts/replies/reactions: alumnos con `has_active_enrollment` **o** creador del curso, y NO baneados.
- INSERT/DELETE propios para alumnos no baneados.
- DELETE de cualquiera + INSERT en bans: solo `is_course_creator`.
- Función `public.is_course_banned(_user, _course)` SECURITY DEFINER.

Trigger en `enrollments`: si el alumno está baneado, bloquear re-enroll (o el ban marca `enrollments.status='banned'`).

### Activación (panel creador, editor del curso)
- Toggle "Activar comunidad — $990 por cada venta de este curso" (deshabilitado + `LockedFeature` si no Pro).
- Se persiste en `courses.community_enabled`.

### Feed (estilo Facebook Groups)
- Posts cronológicos, pinned arriba
- Avatar + nombre (+ badge "Creador" si `author_id = creator_id`)
- Texto, foto opcional (1 sola, bucket `course-assets/community/<course>/...`)
- 👍 toggle, contador respuestas, respuestas anidadas 1 nivel
- Composer alumno: texto + 1 imagen

### Permisos
Como spec. Creador puede borrar/pinear/banear desde vista gestión y desde vista participación (mismas RLS).

---

## 4. Cargo $990 en finanzas

`orders` ya existe. Añadir columna:
```sql
ALTER TABLE public.orders ADD COLUMN community_fee_clp integer NOT NULL DEFAULT 0;
```

Al crear orden de curso en `create-payment` / `mercadopago-webhook`: si `courses.community_enabled`, setear `community_fee_clp = courses.community_fee_clp` y descontarlo del payout del creador (en cálculo de finanzas, no del monto cobrado al alumno; el cargo lo absorbe el creador como en el spec).

Mostrar desglose en:
- `CreatorFinancesPage`: línea "Comunidad activa: -$990" por orden.
- `AdminDashboard` / panel admin ventas: columna "Cargo comunidad" + métrica "Ingresos por comunidades" (suma de `community_fee_clp`).

---

## 5. Recursos por módulo

Tabla actual `lesson_resources` es por lección. Crear paralela `module_resources`:
```sql
CREATE TABLE public.module_resources (
  id uuid pk, module_id uuid references course_modules,
  title text, file_url text, file_size_bytes bigint,
  mime_type text, created_at);
```
+ GRANT/RLS: creador del curso gestiona; alumnos inscritos pueden leer.

UI:
- Editor del módulo: sección "Recursos del módulo" — subir PDF/imagen/Word/Excel.
- Validación cliente: ≤50MB plan Creador, ≤200MB plan Pro (ya hay `useMyPlan`).
- Vista alumno: render bajo la lección actual.

Bucket: `protected-content/module-resources/<course>/<module>/<file>` (usa `get-protected-url`).

---

## 6. Tab "Comunidad" en gestión del curso

Nuevo tab en `CourseEditorPage` junto a Módulos/Lecciones/Alumnos:
- Tabla de posts: autor, preview, fecha, 👍, acciones (Ver / Eliminar / Banear / Pinear)
- Filtros: todos / con reportes (placeholder: por ahora sin sistema de reportes — solo "todos")
- Modal de ban con copy exacto del spec
- Sección "Alumnos baneados" con botón Desbanear (elimina row de `course_community_bans` y reactiva enrollment)

---

## Orden de build

1. Migración (schema completo: courses cols, 4 tablas comunidad, module_resources, orders.community_fee_clp, funciones, RLS, GRANTs)
2. Backend: actualizar `create-payment` / `mercadopago-webhook` para `community_fee_clp`
3. Sidebar creador + redirects de rutas viejas
4. `CourseEditorPage`: tabs nuevos (Páginas de pago, Evaluaciones, Comunidad, Recursos por módulo, Toggle comunidad)
5. `MiPlanPage` con tabs (Plan / Facturación / Integraciones)
6. `CreatorBookingsPage`: tabs (Calendario / Disponibilidad default)
7. `CoursePlayerPage` rediseñado + `CourseCommunityFeed`
8. Finanzas (desglose) + admin (columna y métrica)

## Fuera de scope
- Sistema de reportes de posts (solo filtro placeholder)
- Notificaciones push/email de comunidad
- Edición de posts (solo crear/eliminar)
- Reembolso automático al banear
