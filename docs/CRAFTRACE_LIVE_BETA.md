# CrafRace LIVE DEV — preparación segura

Estado: **núcleo de protocolo y pruebas únicamente**. No existe una carrera online jugable ni se ha desplegado esta rama.

Se trasladan las lecciones funcionales de SlotRace DEV 0.15.82, pero **no** su modelo de física de dos carriles. CrafRace usa un motor y una identidad de pista diferentes.

## Contrato de implementación
- Dos identidades permanentes verificadas por Supabase Auth, mismo UUID de CraftRace Studio, sin usar apodos como identificador.
- Tabla/canales **separados** de SlotRace, autorización RLS de anfitrión/invitado, códigos aleatorios, caducidad, límites antispam.
- Pista, dirección y versión de físicas coincidentes antes de permitir la cuenta atrás; una simulación local por participante y rival visual interpolado, inicialmente sin colisiones.
- Cronómetro por reloj monotónico y sincronización explícita de salida. Nunca confiar en relojes de pared diferentes ni inventar tiempos.
- Pausa al desconectarse; tras reincorporación con código, confirmar a ambos y repetir la manga/prueba interrumpida si se perdió el estado.
- Sin créditos ni récords homologados en esta beta hasta disponer de validación servidor.
- Menús y UX compartidos Android/iOS, adaptación PADDOCK premium, notificación de revancha visible y chat compatible multitáctil.
- La rama NO se integra en Google Play ni en Xcode por publicar la PWA.

## Pendiente para una primera prueba real
- Transportes y tablas/RPC seguros, RLS de Realtime y migración revisada.
- Entrada DEV desde el selector de modalidades.
- Conexión de la carrera real de CrafRace, posiciones remotas, reloj y salida.
- Pruebas de conexión con dos móviles, pérdida de red, reentrada, salida, revancha y resultados.
- Verificar después GitHub Actions y publicación real antes de invitar a probar.

Prueba de regresión de este primer núcleo: node scripts/craftrace-live-protocol-smoke.mjs

## Avance técnico del 15/11/2026 — rama PR #42

**Implementado en código, pero NO desplegado:**
- `supabase/migrations/20261115_038_craftrace_live_rpc_beta.sql`: tablas independientes para salas y paquetes; creación, unión, envío y lectura mediante RPC autenticadas, acceso exclusivo de dos UUID, expiración de dos horas, límites de 6 salas/hora, 12 paquetes/segundo y 5 segundos para chat/reacción/revancha. La migración está en revisión y **NO se ha aplicado al Supabase productivo**.
- `src/game/online/craftraceLiveTransport.js`: transporte HTTP de prueba con sesión de Race Control reutilizada, código criptográfico, sondeo de paquetes, limpieza y rechazo de secuencias repetidas.
- `src/game/ui/craftraceLiveLobby.js` y CSS: laboratorio PADDOCK **solo DEV** con crear/unirse, estado, preparado y mensajes. Se abre desde LIVE LAB en el lobby si se construye esta rama. Sin backend migrado no puede crear salas.
- `src/game/online/craftraceLiveRaceModel.js`: interpolador del coche remoto **solo para representación**, reloj monotónico con pausa, reinicio por manga y rechazo de telemetría obsoleta. No está conectado a la escena de carreras.
- Smoke CI de protocolo, revisión estructural de RPC y reloj/interpolación. **CI no sustituye una prueba de SQL contra PostgreSQL real ni QA con dos teléfonos**.

**No implementado todavía:** backend en producción, permisos probados con JWT reales, presencia robusta, handshake y arranque sincronizado, coches remotos visibles en carrera, conexión del crono con meta/checkpoints reales, recuperación de manga en red, revancha completa, validación antifraude y prueba manual iPhone/Android. El transporte por sondeo a 350 ms **no sirve por sí solo para sincronizar la física de coches**; la interpolación y el protocolo necesitarán integración y medidas de latencia reales.

**Prohibido fusionar/publicar** esta PR como multijugador funcional mientras esas verificaciones sigan pendientes. El acceso LIVE LAB es una herramienta de diagnóstico, no una función terminada. Ninguna tabla existente, datos de pilotos, versión pública de Android o proyecto Xcode se han modificado.
