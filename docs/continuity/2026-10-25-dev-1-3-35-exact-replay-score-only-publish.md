# DEV 1.3.35 — REPLAY exacto, tiempo publicable sin grabación

25/10/2026 · rama main · DEV only.

## Solicitud y evidencia
El jugador mostró su informe de sesión: PB **0:33.554 en Karting Tenerife**, con mejora personal de 18.952 s, pero una advertencia roja «No se ha podido recuperar la repetición exacta de esta LAP». A su vez, Race Control mostraba un botón REPLAY que al pulsarlo reproducía una vuelta distinta. El usuario exige que se permita publicar la marca legítima aunque no haya repetición.

## Diagnóstico
- La capa `StatsBroadcastRealReplayScene` comprobaba si existía un fantasma bajo `selected.ghostKey` y muestras, sin comparar su lapMs/coche/track con el récord personal del panel. La lista Top Laps podía abrir un replay de otro registro si la clave apuntaba a muestras antiguas.
- La ruta de publicación del informe y Race Control abortaban antes del anuncio si no encontraban fantasma exacto. La RPC existente `submit_track_record` ya acepta un tiempo sin replay, autenticado. El panel ocultaba el botón cuando `ghostKey` faltaba.
- En el backend, la RPC heredada no borraba el antiguo `ghost_payload` al mejorar un récord sin grabación, lo que podía hacer que una vuelta obsoleta apareciese como replay de la nueva. Se ha corregido eso.

## Cambios
- `src/game/tracks/exactLocalReplay.js`: valida identidad del circuito y sentido, coche, lapMs (tolerancia 2 ms), mínimo cinco muestras, y fecha ±10 s cuando ambos timestamps están disponibles. Busca por las claves oficiales de PB y la fila concreta, nunca por simple existencia ni «la primera grabación».
- `StatsBroadcastRealReplayScene`: REPLAY de PB solo visible si existe una grabación exacta; si falta se informa «REPLAY EXACTO NO DISPONIBLE». Vuelve a validar el archivo al pulsar y antes de abrir el modal.
- `StatsBroadcastReplayScene`: la lista Top Laps valida cada vuelta individualmente y revalida al pulsar. Otros circuitos/inversos y coches no se mezclan.
- `StatsBroadcastScene`: botón publicar visible para mejor tiempo positivo aunque `ghostKey` no exista. Si hay replay exacto y geométricamente compatible, continúa publicando tiempo+fantasma por `submit_track_record_with_ghost`. En caso contrario, diálogo explicativo y consentimiento explícito para publicar **solo tiempo**, sin VS ni vídeo; mantiene anuncio recompensado y el saldo de verificación por intento.
- `sessionRecordPublishOffer.js`: mismo comportamiento para nuevo récord al finalizar carrera. Se informa antes de reproducir anuncio, no se sube una grabación falsa, y se confirma éxito solo cuando Supabase devuelve la fila.
- `raceControlOnline.js`: `submitRaceControlRecordWithoutGhost` utiliza la RPC preexistente autenticada `submit_track_record`, no un endpoint anónimo.
- Migración **aplicada en Supabase** `20261025_020_time_only_record_ghost_integrity.sql`: `submit_track_record` conserva las validaciones y permisos de identidad original, y al recibir mejora sin replay deja `ghost_format/payload/sample_count/size_bytes` a null y genera nuevo record_ref; `get_track_leaderboard` calcula ghost_available desde `ghost_payload is not null`. Esto evita reproducir la grabación de una marca anterior. Si no mejora, preserva el tiempo/ghost previo. No ha sido necesaria modificación de datos actuales.
- Test regresión `npm run check:race-control-exact-replay`: 0:33.554 vs 0:52.506; invalidación circuito inverso, coche y timestamp; faltante; RPC segura y consentimiento del anuncio. Actualizados los smoke del informe que previamente exigían ghost siempre.

Sin editar récords locales, perfiles, historiales, geometría o física. No APK/AAB ni cambios Google Play.
