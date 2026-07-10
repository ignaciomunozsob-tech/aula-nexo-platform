## Objetivo

Darte una forma clara de **verificar el 10% de comisi\u00f3n de NOVU** sin necesidad de tener una segunda cuenta MercadoPago para probar el split.

## C\u00f3mo funciona hoy (contexto)

Cuando un alumno paga:

1. El pago entra **directo a la cuenta MercadoPago del creador** (usamos su `access_token`).
2. NOVU env\u00eda a MercadoPago el par\u00e1metro `marketplace_fee = 10%` en la preferencia de pago.
3. MercadoPago **retiene autom\u00e1ticamente ese 10%** y lo deposita en la cuenta MP de NOVU. El creador ve en su cuenta MP la venta con el monto ya neto.
4. En la tabla `orders` guardamos: `amount_clp` (bruto), `platform_amount_clp` (10% NOVU), `community_fee_clp` ($990 si aplica) y `creator_amount_clp` (lo que te queda).

O sea, el split ya est\u00e1 pas\u00e1ndose bien a MercadoPago \u2014 pero no ten\u00edas d\u00f3nde verlo dentro de NOVU para cruzarlo con tu Actividad de MercadoPago.

## Qu\u00e9 voy a agregar

En **/creator/finances**, una nueva tabla "Desglose por venta" que muestre, por cada `order` con `status = 'paid'`:

```text
Fecha | Producto | Bruto | \u2212 NOVU 10% | \u2212 Comunidad | = Neto a tu MP
```

- Se lee directo de `orders` (`amount_clp`, `platform_amount_clp`, `community_fee_clp`, `creator_amount_clp`), sin nuevos campos ni migraci\u00f3n.
- Debajo, una nota corta explicando c\u00f3mo cruzarlo con tu cuenta MercadoPago: "El monto en 'Neto a tu MP' debe coincidir con lo que ves en Actividad \u2192 Ventas de tu cuenta MercadoPago para esa fecha."
- Agrego totales al pie: total bruto, total NOVU retuvo, total neto que recibiste.

## Detalles t\u00e9cnicos

- Archivo: `src/pages/creator/CreatorFinancesPage.tsx` \u2014 extender el `useQuery` para traer tambi\u00e9n `platform_amount_clp` y `creator_amount_clp` de `orders` (ya se consulta `orders` para `community_fee`, solo agrego columnas al `.select`).
- Nueva `<Card>` "Desglose por venta \u2014 verificaci\u00f3n de comisi\u00f3n" con `<Table>` responsive.
- Sin cambios en backend, edge functions ni base de datos.

## Fuera de alcance

- No agrego cuentas de prueba de MercadoPago (requerir\u00eda credenciales `TEST-` separadas y no vale la pena para una sola verificaci\u00f3n).
- No cambio la l\u00f3gica de `marketplace_fee` \u2014 ya est\u00e1 correcta.
