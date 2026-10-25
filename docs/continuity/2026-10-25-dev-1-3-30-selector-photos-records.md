# DEV 1.3.30 — Foto 7 Picos y récords del selector

Fecha: 25/10/2026. Rama: main.

El usuario mostró captura del selector de circuitos: la tarjeta 7 Picos y el panel grande solo representaban un trazado plano y no la fotografía aérea real. Causa: el circuito no figuraba en `TRACK_SELECTOR_PHOTO_PATHS`, aunque la nueva WebP 4344×3258 estaba ya instalada en assets.

- `src/game/tracks/trackSelectorPhotos.js`: incorpora 7 Picos, y `siete-picos-inverso` reutiliza la misma fotografía mediante el sistema existente de variantes.
- `scripts/build-track-selector-photos.mjs`: genera `public/assets/tracks/selector/siete-picos.webp` mediante Sharp a 900×600 (fit contain), directamente de `public/assets/tracks/siete-picos/7-picos.webp`. Se verifican siete fotos (seis anteriores + nueva), tamaños limitados.
- El jugador pidió en esquina superior derecha del selector dos tiempos por circuito: `RÉCORD ABSOLUTO` y `TU RÉCORD`. `src/game/ui/selectorRaceRecords.js` consulta una sola vez el snapshot público `web_leaderboard_snapshot` a través de la configuración pública online ya utilizada por Race Control, con TTL 3 minutos, timeout 5.5 segundos y sin auto-crear cuentas anónimas. Solo muestra datos de ranking válidos publicados; `—` si no hay tiempo e indicación si no hay conexión.
- PB personal: se recupera de `getCircuitRecord(trackId)` como en estadísticas locales; no se mezcla con el ranking global.
- `TrackGarageAndroidTouchScene`: añade tarjeta al panel del circuito en un único montaje y refresca al pulsar Normal/Inverso, utilizando `selectedCircuitRaceId`. Sin RAF adicional, listeners globales ni timers recurrentes. Respuestas tardías no pueden contaminar otro circuito.
- CSS responsive sin tapar botón SELECCIONAR ni cabecera. No enseñar tiempos de circuitos bloqueados.
- Smoke `scripts/selector-records-smoke.mjs` y suite de selector fotos en prebuild. No se cambian fotos de carrera, colisiones, físicas ni publicación en Play. No APK/AAB manual.

Advertencia: el récord absoluto mostrado proviene de la última actualización del snapshot público de Supabase; si un circuito todavía no aparece en ese snapshot, se muestra — hasta que se publique su primera fila y entre en el snapshot.
