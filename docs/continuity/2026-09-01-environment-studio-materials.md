# Environment Studio — Material workflow

Fecha: 2026-09-01
Rama: develop

## Objetivo
Environment Studio incorpora un módulo MATERIALES para probar visualmente las tres superficies principales del circuito sin tocar el renderer Beauty de carrera.

## Superficies
- ASFALTO: máscara exacta de la cinta de pista calculada por `buildTrackRibbon`.
- HIERBA: corredor exterior de pista calculado con `grassMargin`/ancho de pista.
- OFFROAD: fondo completo del mundo editable.

## Flujo
- Cada slot admite selección de archivo y drag & drop (`png`, `jpg`, `webp`).
- La textura se aplica inmediatamente al lienzo del Studio.
- Repetición y brillo se pueden ajustar mediante sliders.
- Los blobs se almacenan en IndexedDB `tdr2_environment_materials`, store `textures`, con clave `<trackId>:<surface>`.
- El `.environment.json` solo guarda metadatos (`fileName`, `repeat`, `brightness`) para evitar inflar localStorage/JSON con data URLs.
- Al volver al mismo circuito en el mismo dispositivo, el Studio recupera los blobs de IndexedDB y reconstruye la previsualización.

## Separación de responsabilidades
Este sistema es solo una herramienta de autoría/preview de Environment Studio. No sustituye ni modifica `trackBeautyLayers`, manifests Beauty ni el renderer de carrera. La publicación de materiales definitivos sigue requiriendo convertirlos a assets del repo / Beauty Layer según el pipeline de producción.

## Implementación
Archivo principal: `src/game/scenes/EnvironmentBuilderMaterialStudioScene.js`.
Commit de previsualización real: `e39506c7752a4a60b1ade06d0e2618b422e7798b`.
