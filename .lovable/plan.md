## Diagnóstico

El backend ya intentó leer y crear eventos en Google Calendar, pero Google está rechazando las llamadas por dos motivos:

1. **Google Calendar API está desactivada** en el proyecto de Google asociado al `GOOGLE_OAUTH_CLIENT_ID` actual. Por eso no se pueden leer horarios ocupados ni crear eventos.
2. La conexión OAuth actual no tiene permiso para listar calendarios secundarios: falta un scope de lectura/listado de calendarios.
3. El texto `shdjfhg.supabase.co quiere leer tu calendario` no se corrige desde React: viene de la **pantalla de consentimiento OAuth configurada en Google Cloud** para ese Client ID. Ahí debe figurar el nombre público **NOVU**.

## Plan de implementación

1. **Actualizar scopes de Google Calendar**
   - Agregar el permiso necesario para listar calendarios visibles/seleccionados del creador.
   - Mantener permisos actuales para:
     - ver disponibilidad (`freebusy`)
     - crear eventos
     - obtener email de la cuenta conectada

2. **Forzar reconexión limpia**
   - Ajustar el flujo para que al reconectar se pidan los permisos nuevos.
   - Mostrar en Integraciones un estado claro si la cuenta conectada quedó con permisos incompletos y pedir “Reconectar Google Calendar”.

3. **Mejorar errores visibles**
   - Si Google responde que la Calendar API está desactivada, mostrar un mensaje claro en Integraciones/Bookings en vez de fallar silenciosamente.
   - Si falta permiso, mostrar que debe reconectarse Google Calendar.

4. **Asegurar creación de evento en Google**
   - Mantener la creación del evento en el calendario principal del creador.
   - Guardar `google_event_id`, `google_html_link` y `meet_url` cuando Google lo cree.
   - Si Google falla, devolver/registrar el motivo exacto para no confundirlo con una reserva exitosa completamente sincronizada.

5. **Acción requerida fuera del código**
   - En Google Cloud, el dueño del OAuth Client debe:
     - habilitar **Google Calendar API** para el proyecto `GOOGLE_OAUTH_CLIENT_ID` actual;
     - cambiar el nombre de la app en la pantalla de consentimiento a **NOVU**;
     - verificar que los dominios autorizados incluyan `soynovu.cl` y `lovable.app` si corresponde.

Después de esto, habrá que desconectar y volver a conectar Google Calendar desde Integraciones para que Google emita tokens con los permisos nuevos.