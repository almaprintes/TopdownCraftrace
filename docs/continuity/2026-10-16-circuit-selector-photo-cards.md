# Selector de circuitos — tarjetas fotográficas TDR (DEV 1.2.248)

El propietario aprobó una **referencia estética** de tarjetas premium con fotografía aérea, contraste alto, asfalto marcado, negro/azul oscuro y acentos cian y ámbar para rally. Indicó explícitamente: **no generar más imágenes; modificar el selector dentro del juego**.

## Implementación real, sin maqueta ni assets inventados

El jugador usa el DOM de `src/game/scenes/TrackGarageProgressionScene.js`, especializado por `TrackGaragePlayerLightScene.js`. El antiguo selector dibujaba únicamente el trazado en SVG. Ahora cada tarjeta desbloqueada y el panel grande incorporan fotografía WebP del **propio circuito** y ofrecen el antiguo SVG como fallback, además de pequeño mapa sobre la fotografía. La columna de selección, el panel de detalles, los eventos de navegación, botón de seleccionar, estado de bloqueo, longitud, sectores y superficie permanecen activos. Los circuitos bloqueados muestran **??? / candado**, sin revelar URL ni miniatura.

`src/game/ui/trackSelectorPhoto.css` aporta bordes cian (ámbar para Arafo), imágenes con alto contraste, etiqueta CIRCUITO/RALLY, título destacado y fotografía en el panel grande, con disposiciones específicas para vertical móvil y horizontal. Se inyecta tras los otros estilos únicamente al abrir el selector. Solo afecta a `#tdr-track-selector-dom`.

`src/game/tracks/trackSelectorPhotos.js` contiene el mapa de identidades exactas a archivos UI. No usa el nombre visual para resolver el asset, evitando fotos equivocadas cuando se traduce el juego.

## Fuentes verificables (ninguna imagen creada por IA)

El script `scripts/build-track-selector-photos.mjs` **recorta y corrige color de fotografías/previas que ya están en el repositorio** y crea seis WebP 900×600 (calidad 77) dentro de `public/assets/tracks/selector`:
- `karting-canarias`: fotografía master `karting-canarias-new.webp`.
- `rally-arafo-los-loros`: fotografía master `arafo-los-loros-photo.webp`.
- `karting-americas`: imagen oficial que `install-karting-americas-source.mjs` extrae del .tdrtrack existente; el origen es `karting-americas-official.webp`, **no se reutiliza foto de otro circuito**.
- `santa-cruz`, `karting-tenerife`, `circuito-atlantico`: cada uno usa exclusivamente su propia ilustración de juego `*-beauty-preview.webp` ya existente, mientras no haya fotografía nueva publicada para ese circuito.

La preparación sucede al ejecutar `npm run predev` y `npm run prebuild` y no crea texturas Photoshop/IA ni modifica los recursos de carrera. El juego no carga fotos de 2–14MB en el selector: muestra solo los WebP optimizados; esto reduce memoria en iOS.

`scripts/track-selector-photos-smoke.mjs` comprueba los 6 IDs, dimensiones/codificación/peso de cada WebP, ruta BASE_URL de Pages, privacidad de circuitos bloqueados y la integración con selector DOM, cabecera, scroll y botón de selección. Esta prueba está en `prebuild`.

## Restricciones y pruebas

No modificar carriles, colisiones, escala del coche, audio, monetización ni los parámetros de carrera. No publicar Android: 1.1.188/vc8 sigue en Play Store. Validar **Build y Deploy del HEAD exacto**. Tras desplegar, revisar visualmente en iPhone la legibilidad del nombre, escala de foto y desplazamiento de la lista; la compilación no equivale a revisión visual de dispositivo.
