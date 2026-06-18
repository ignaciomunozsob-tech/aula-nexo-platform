## Objetivo

Que todos los productos públicos tengan URLs limpias del tipo:
`https://soynovu.cl/nombre-creador/nombre-producto`

Sin el `#` actual y validando que el slug del producto sea único dentro de cada creador (entre cursos, eventos, ebooks y sesiones).

---

## Cambios

### 1. Quitar el `#` de las URLs

Hoy las URLs se ven como `soynovu.cl/#/curso/abc`. Vamos a cambiar el router para que sean `soynovu.cl/curso/abc`. Las rutas internas (login, dashboards) seguirán funcionando igual.

Cubre redirección para usuarios que tengan links antiguos con `#`: si entran a `/#/algo`, se les manda a `/algo`.

### 2. Slug para sesiones 1:1

Las sesiones 1:1 hoy no tienen "slug" (URL legible). Vamos a:
- Agregar el campo `slug` a sesiones (auto-generado desde el título al crear/editar).
- Reemplazar la URL pública `/c/creador/sesion/uuid-largo` por `/creador/nombre-sesion`.

### 3. Validación de slug único por creador

Un mismo creador no podrá tener dos productos (curso/evento/ebook/sesión) con el mismo slug. Si intenta publicar uno repetido:
- Se le muestra error claro al guardar/publicar.
- Sugerencia automática del slug con sufijo (`mi-curso-2`).

Esto evita ambigüedad en las URLs `/creador/slug`.

### 4. Resolver universal de URL pública

Nueva ruta `/:creatorSlug/:slug` que:
- Busca el slug entre los productos del creador (cursos → eventos → ebooks → sesiones, en ese orden).
- Renderiza la página de detalle correspondiente.
- Si no existe → muestra 404 amigable.

### 5. Páginas de detalle faltantes

Hoy no hay página pública de:
- Evento individual
- Ebook individual

Se crean páginas de detalle mínimas (cover, descripción, precio, botón "Comprar/Inscribirme") usando el mismo estilo de `CourseDetailPage`.

### 6. Actualización de links internos

Todos los enlaces a productos en:
- Homepage (marketplace, destacados)
- Perfil del creador
- Marketplace estudiante
- Listados del creador (vista previa)
- Botones "compartir"

…apuntarán al formato nuevo `/creador/slug`. URLs antiguas como `/course/:slug` siguen funcionando como redirección permanente para no romper links indexados.

### 7. SEO

- Cada página de producto: `<title>` con nombre del producto + creador, meta description, canonical apuntando a la URL bonita.
- Sitemap regenerado incluye las nuevas URLs.

---

## Detalles técnicos

- **Router**: `HashRouter` → `BrowserRouter`. El hosting de Lovable ya hace fallback SPA para rutas profundas.
- **Migración DB**:
  - `ALTER TABLE one_on_one_sessions ADD COLUMN slug text`.
  - Backfill de slug desde título existente.
  - Función `check_unique_creator_slug(creator_id, slug, exclude_table, exclude_id)` + trigger BEFORE INSERT/UPDATE en `courses`, `events`, `ebooks`, `one_on_one_sessions` que verifica unicidad cross-tabla por creador y levanta `unique_slug_per_creator` con HINT amigable.
  - RPC `resolve_creator_product(creator_slug, product_slug)` → `(product_type, product_id)` para que el resolver del frontend haga una sola query.
- **Resolver frontend**: `/:creatorSlug/:slug` llama al RPC y renderiza el componente según `product_type`.
- **Redirecciones**: pequeñas rutas legacy (`/course/:slug`, `/c/:creatorSlug/sesion/:id`) hacen `<Navigate>` al nuevo formato consultando el slug.
- **Auto-slug** en editores: helper que slugifica el título y, si choca, agrega `-2`, `-3`.

---

## Rutas reservadas (no se pueden usar como slug de creador)

`app`, `creator-app`, `admin`, `login`, `signup`, `forgot-password`, `reset-password`, `verify-2fa`, `courses`, `precios`, `comisiones`, `terminos`, `privacidad`, `trust`, `unsubscribe`, `payment`, `booking`, `p`, `embed`, `c`, `course`, `creator`, `preview`, `debug`.

Se valida en la creación de `creator_slug` (perfil del creador) que no esté en esta lista.

---

## Verificación

- Crear curso "Test Curso" en cuenta de creador → URL pública `/mi-creador/test-curso` carga el detalle.
- Crear evento con mismo slug → error al publicar con mensaje claro.
- Visitar URL antigua `/#/course/test-curso` → redirige a `/mi-creador/test-curso`.
- Sesión 1:1: link de reserva pasa de `/c/mi-creador/sesion/uuid` a `/mi-creador/sesion-30min`.
