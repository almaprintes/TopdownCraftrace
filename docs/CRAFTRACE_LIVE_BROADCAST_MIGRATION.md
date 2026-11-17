# CrafRace LIVE — transición segura a Broadcast (main)

Estado: **diseño pendiente de activación**. El multijugador actual sigue usando RPC HTTP.

## Auditoría verificada (17/11/2026)

- `src/game/online/craftraceLiveTransport.js` guarda **todos** los eventos, incluidas posiciones, con `craftrace_live_send`; recupera mediante `craftrace_live_poll` cada 350 ms.
- `src/game/online/craftraceLiveRaceBridge.js` emite posiciones a 150 ms cuando el coche se mueve y a 500 ms detenido (optimización de main `ad7fb18`).
- `supabase/migrations/20261115_038_craftrace_live_rpc_beta.sql` persiste paquetes en `public.craftrace_live_packets` y no define una tarea automática de purga.
- El frontend **no tiene** `@supabase/supabase-js` instalado; utiliza REST propio y sesiones de Race Control.

## Requisitos para habilitar Broadcast

1. Elegir cliente Realtime mantenido (versión fijada y lockfile actualizado), reutilizando el JWT de la identidad existente; nunca crear una identidad adicional.
2. Canales **privados** por UUID de sala, con políticas RLS de `realtime.messages` para SELECT/INSERT, restringidas al `host_id` y `guest_id` de salas vigentes. Revisar ajuste de acceso público del proyecto.
3. Mantener RPC para crear/unirse a sala, handshake, inicio, chat, pausas y recuperación. Solo las posiciones efímeras deben usar Broadcast.
4. No activar Broadcast hasta confirmar suscripción de ambos pilotos. No enviar posiciones por dos transportes simultáneamente sin control de duplicados.
5. Reconexión: revalidar JWT y pertenencia a la sala, restaurar generación/manga, y recuperar eventos de control por RPC. Broadcast no proporciona historial de posiciones.
6. Conservar el interpolador visual y validar secuencia, remitente, generación, manga y límites de payload antes de dibujar al rival.
7. Medir mensajes Realtime, egress, RTT, pérdida de paquetes y tamaño de PostgreSQL; comparar carreras idénticas iPhone/Android.
8. Flag reversible, **desactivado por defecto** hasta pruebas de permisos y dos dispositivos. No borrar paquetes existentes ni aplicar migraciones destructivas.

## Pruebas bloqueantes

- Usuario no invitado no puede suscribirse ni enviar a la pista.
- Los dos pilotos pueden entrar, correr dos mangas y ver al rival sin saltos.
- Caída y recuperación de red, cambio de Wi-Fi a datos, token caducado, revancha, cambio de manga.
- Un fallo de Broadcast no debe dejar la partida sin controles; la recuperación HTTP debe funcionar.
- CI de build y smoke tests, despliegue de Vercel correcto y prueba real antes de activar la flag.

Documentación de referencia: https://supabase.com/docs/guides/realtime/broadcast y https://supabase.com/docs/guides/realtime/authorization.
