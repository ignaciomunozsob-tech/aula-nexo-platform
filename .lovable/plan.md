
# Flujo de compra unificado — Correos y redirecciones

## Estado actual (auditoría)

| Producto | Acceso otorgado | Email al comprador | Email al creador | Email admin | Redirección |
|---|---|---|---|---|---|
| Curso | ✅ enrollment | ❌ **falta** | ✅ | ✅ | ✅ `/compra-confirmada/{ref}` |
| Ebook | ✅ (por orden) | ❌ **falta (con link de descarga)** | ✅ | ✅ | ✅ |
| Evento (pago) | ✅ registration | ✅ `event-registration-confirmation` | ✅ | ✅ | ✅ |
| Evento (gratis) | ✅ | ✅ | — | — | inline |
| Comunidad | ✅ member | ❌ **falta** | ✅ | ✅ | ✅ |
| Sesión 1:1 | ✅ booking | ❌ **falta** (solo tiene ICS token) | ❌ **falta** | — | `/booking-success` |
| Nuevo usuario (guest) | — | ✅ password reset | — | — | — |

**Problemas identificados:**
1. Cursos, ebooks, comunidades y sesiones 1:1 no envían un correo de confirmación al comprador con acceso directo.
2. Las reservas 1:1 no notifican al creador por correo.
3. No hay un template unificado — cada producto necesita su propio correo con el CTA correcto.

---

## Flujo objetivo (unificado)

```text
Compra iniciada
   │
   ├─ Usuario nuevo (guest) → crea auth user + envía email "configura tu contraseña"
   │
   ▼
MercadoPago aprueba → webhook
   │
   ├─ 1. Otorgar acceso (enrollment / registration / member / order paid)
   ├─ 2. Email al COMPRADOR (según producto) ← NUEVO
   ├─ 3. Email al CREADOR (venta) ✅ existente
   ├─ 4. Email al ADMIN (venta) ✅ existente
   │
   ▼
Frontend redirige a /compra-confirmada/{reference}
   │
   ├─ Muestra resumen (producto, monto, cuotas, referencia)
   ├─ Dispara Meta Pixel Purchase
   ├─ Si el creador definió redirect_url → auto-redirige en 5s
   └─ Si es usuario nuevo → banner "revisa tu correo para tu contraseña"
```

Sesiones 1:1 (booking-create) siguen el mismo patrón después de crear el evento en Google Calendar.

---

## Cambios a realizar

### 1. Nuevos templates de correo al comprador
En `supabase/functions/_shared/transactional-email-templates/`:

- `buyer-course-purchase.tsx` — "Ya tienes acceso a {curso}" → CTA: ir al curso (`/app/course/{id}` o `redirect_url`).
- `buyer-ebook-purchase.tsx` — "Tu ebook está listo" → CTA: descargar (link a `/app/my-courses` que renderiza el descargable) + nota sobre nuevo usuario.
- `buyer-community-purchase.tsx` — "Bienvenido a {comunidad}" → CTA: ir a la comunidad.
- `buyer-session-booking.tsx` — "Tu sesión con {creador} está confirmada" → fecha/hora, Meet URL, botón añadir a calendario (ICS token existente).
- `creator-new-booking.tsx` — Nueva reserva 1:1 → datos del asistente, fecha, Meet URL.

Todos con branding NOVU actual (logo, `#fcc70e`, Inter, fondo `#ffffff`). Registrarlos en `registry.ts`.

### 2. Emisión desde `mercadopago-webhook`
Después de `fulfillOrder(...)` y antes de emails de creador/admin, agregar un switch por `product_type` que llame `send-transactional-email` con el template correspondiente. Guard de idempotencia: nueva columna `buyer_email_sent boolean` en `orders` (migración).

### 3. Emisión desde `booking-create`
Después de insertar el booking + crear el evento en Google, invocar:
- `buyer-session-booking` al asistente.
- `creator-new-booking` al creador.

Con `idempotencyKey = booking-{id}-buyer` / `-creator`.

### 4. Ajustes a `PurchaseConfirmedPage`
Sin cambios de flujo. Solo asegurar que el CTA "Acceder ahora" para ebook lleve a `/app/my-courses` (ya lo hace) y añadir mensaje explícito "también te enviamos un correo con el enlace" cuando el producto es ebook o curso.

### 5. Migración DB
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_email_sent boolean NOT NULL DEFAULT false;
```

### 6. Deploy
`deploy_edge_functions` sobre `mercadopago-webhook`, `booking-create`, `send-transactional-email`.

---

## Fuera de alcance
- Refactor del `PurchaseConfirmedPage` (ya funciona).
- Cambios en templates existentes (`admin-new-sale`, `creator-new-sale`, `event-registration-confirmation`).
- Emails de marketing / recordatorios (Lovable no soporta marketing).
- Reembolsos / cancelaciones (flujo aparte).

## Detalles técnicos
- Todos los correos van por la infraestructura Lovable Emails existente (`send-transactional-email` + cola pgmq).
- `idempotencyKey` derivado del `order.id` o `booking.id` para evitar duplicados en retries de MP.
- Los templates reciben `redirectUrl` (si el creador lo configuró) para que el CTA respete la redirección personalizada.
- Sin adjuntos: los ebooks se acceden vía link firmado desde el panel del alumno.
