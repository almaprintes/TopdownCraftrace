# DEV 1.3.36 — Rivales cercanos por tiempo y replay PB independiente

26/10/2026 · repo `almaprintes/TopdownCraftrace` · rama `main` · solo DEV.

## Objetivo
El usuario rechaza limitar fantasmas a top10/top100: con 50.000 pilotos, el situado en 45.455 desea perseguir una vuelta unas décimas más rápida. Cada mejor marca publicada debe aspirar a tener su replay exacto; no descargar rankings completos ni todos los ghosts. El usuario acepta repensar el aspecto visual de Race Control y enfrentamientos basándose en una referencia de UI de tarjetas.

## Backend aplicado
Migración Supabase `20261026_001_time_matched_ghost_rivals.sql` desplegada en el proyecto West EU. RPC SECURITY DEFINER `get_race_control_nearby_ghosts(track,time,min,max,limit)`: requiere auth.uid() y perfil; valida id, tiempo, diferencia 1–120.000 ms y límite de filas 1–12; consulta por intervalo en `track_records` usando índice `(track_id,best_time_ms)`; ignora filas sin replay y la propia; retorna nickname, puesto basado en ranking absoluto de tiempos, coche, tiempo, delta y record_ref; **no transmite ghost_payload**. Función autorizada solo al rol `authenticated`. El binario se sigue recuperando desde `get_track_record_ghost` únicamente tras anuncio recompensado.

## DEV Race Control
`raceControlOnline.js` incorpora `getRaceControlNearbyGhostRivals`, con parámetros acotados. Panel `raceControlNearbyRivalsPanel.js` se monta justo debajo del circuito destacado, con UI premium azul oscuro/cian. Rango máximo ajustable 0,3/1/3/10 segundos, por defecto 1 s; resultados top8 ordenados por diferencia mínima, caché 90 s, sin peticiones por cuadro ni descarga de muestras durante listado. No hay candidatos → ampliar margen; sin PB → completar vuelta; sin identidad online → iniciar/vincular perfil.

`StatsBroadcastRealReplayScene.js` conecta acciones VER REPLAY / VS a métodos existentes, comprueba anuncio recompensado por record_ref y revalida id circuito+sentido, coche, lapMs, record_ref y muestras del ghost obtenido. Reusa caché y el módulo de desafío VS, no cambia la física. Respuestas atrasadas no deben mezclarse con otro circuito.

## Grabación PB
`RaceTop10ReplayScene.js` detecta siempre si la vuelta completada coincide con el mejor tiempo oficial, independientemente de ocupar la lista local top10 o de que falle el archivo replay secundario, y ejecuta `persistOfficialPersonalBestReplay` antes de `write(top10)`. Conserva un PB por circuito/sentido. El helper comprueba geometría/tiempo/muestras y localStorage solo sobrescribe cuando puede completar la escritura. **No garantiza 100 %** si la grabación no tiene muestras, no hay espacio o se corta la PWA: el flujo excepcional de publicación de tiempo sin replay permanece; requerirá seguimiento.

## Limitación de diseño
La referencia visual dio lugar a un mockup aspiracional más amplio (cabecera Race Control, hero del circuito, fila fotográfica de pistas, tarjetas de rivales, temporada). DEV 1.3.36 integra solo el panel de emparejamiento en la interfaz existente; para remodelar todo Race Control de forma segura, hacerlo en otra iteración y aprobar tamaños/legibilidad de iPhone.

Sin cambios de Google Play, AAB, APK, perfiles, tiempos online existentes o anuncios.
