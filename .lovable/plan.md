## Estado actual — sí, los 4 flujos están activados

Revisé el webhook de MercadoPago (`mercadopago-webhook`) y en cada compra pagada se disparan hasta **4 correos**, cada uno con su propio flag idempotente para no duplicar:

| Destinatario | Cuándo | Template | Flag |
|---|---|---|---|
| **Comprador (producto principal)** | Siempre que hay `buyerEmail` | `buyer-course-purchase` / `buyer-ebook-purchase` / `buyer-community-purchase` / `event-registration-confirmation` | `buyer_email_sent` |
| **Comprador (order bump)** | Solo si la compra incluye bump | mismo set según el tipo del bump | `bump_email_sent` |
| **Creador** | Siempre que el creador tenga email | `creator-new-sale` | `creator_email_sent` |
| **Admin NOVU** | Siempre | `admin-new-sale` | `admin_email_sent` |

Cada envío pasa por el helper `sendEmail` que **lanza excepción si falla**, así el flag solo se marca `true` cuando el correo quedó realmente encolado en `email_send_log`. Si algo falla, se reintenta en el próximo webhook de MercadoPago para esa misma orden.

## Qué recibe cada uno

- **Comprador**: confirmación con nombre del producto, creador, link de acceso (curso/ebook/comunidad/evento), y si es cuenta nueva, el email con el que quedó registrada.
- **Comprador con bump**: segundo correo separado con el acceso al producto del bump (curso, ebook, evento o comunidad).
- **Creador**: aviso de nueva venta con producto, monto y datos del comprador.
- **Admin**: aviso interno de nueva venta.

## Verificación propuesta

Para confirmar en vivo que todo llega:

1. Consultar `email_send_log` filtrando por una `reference` reciente (ej. la última orden `paid`) y mostrar las 4 filas con status `sent`.
2. Si en alguna orden reciente falta alguno de los 4, revisar el `error_message` de esa fila y corregir la causa puntual (dominio, template, dato faltante).
3. Opcional: agregar un pequeño panel en el Creator App ("Notificaciones enviadas por venta") que muestre esos 4 flags para cada orden, para que el creador tenga visibilidad sin pedirlo.

¿Quieres que ejecute la verificación (paso 1) sobre las últimas ventas y, si detecto algo faltante, lo arregle? ¿O prefieres además que agregue el panel del paso 3?
