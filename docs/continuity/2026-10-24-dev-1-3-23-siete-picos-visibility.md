# DEV 1.3.23 — 7 Picos visible y seleccionable en DEV

Fecha 24/10/2026. Basado en 1.3.22; repo main.

Tras escalar ×2.5 el mundo de 7 Picos e importar 73 nodos de colisiones, el propietario no veía el circuito para seleccionarlo. La lista del editor utiliza `getTrackKeys()` y lo dejaba en mitad/final de una lista larga. Al abrir el selector de Environment Studio, `siete-picos` aparece primero solo para ese panel, sin cambiar ningún otro circuito ni estado.

El selector de jugador es distinto: `TrackGaragePlayerLightScene` filtra un conjunto estático `isPublishedTrackId` y además `meta.hiddenFromTrackSelect`. Se añadió una excepción explícita DEV para 7 Picos en `isPublishedTrackId`, `isTrackUnlocked` y `playerVisible`; el archivo TrackStudio conserva el `hiddenFromTrackSelect:true`, los IDs `PUBLISHED_TRACK_IDS` y los desbloqueos almacenados permanecen invariables, y en Google Play/PROD se mantiene oculto.

No tocar pistas, geometría, foto, CP, env JSON, físicas, clasificación ni móviles Android. Solo permitir edición y test directo en DEV. Smoke `scripts/siete-picos-dev-visibility-smoke.mjs` en prebuild. No APK/AAB manual.
