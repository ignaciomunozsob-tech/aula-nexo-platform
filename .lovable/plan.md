## Plan

1. **Corregir la raíz del `Invalid lessonId`**
   - Ajustar el editor para que, cuando una lección nueva se persista antes de subir video, el componente uploader reciba inmediatamente el UUID real y no siga usando el ID temporal `new-...` de la renderización anterior.
   - Evitar que el callback de subida capture índices/IDs obsoletos después de crear la lección.

2. **Blindar el frontend contra IDs temporales**
   - Antes de llamar a la función de creación de video, validar que el ID final sea UUID real.
   - Si la lección todavía no existe, crear módulo/lección primero y usar ese ID real para la llamada.
   - Quitar logs de depuración del navegador que ya no te sirven en iPad.

3. **Mejorar la respuesta de error de la función**
   - Mantener logs internos con el `lessonId` recibido.
   - Retornar error claro si llega un ID temporal, sin iniciar ningún flujo Bunny.
   - No cambiar el endpoint TUS ni el reproductor.

4. **Verificación**
   - Revisar que el uploader use el `lessonId` preparado para `bunny-create-video`.
   - Desplegar la función si se modifica.
   - Validar con logs de backend que ya no llegue `new-...` a `bunny-create-video`.