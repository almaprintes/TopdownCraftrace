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


## DEV 1.2.249 — tres imágenes obsoletas corregidas (17/10/2026)

Tras probar el selector, el propietario detectó que **Karting Tenerife, Santa Cruz y Circuito Atlántico** mostraban imágenes anteriores al aspecto jugable vigente. El origen del error estaba en `scripts/build-track-selector-photos.mjs`: referenciaba los `beauty-preview.webp` históricos aun cuando los instaladores actuales ya contienen fotografías más recientes.

- **Karting Tenerife**: ahora usa `public/assets/tracks/karting-tenerife/karting-tenerife-official.webp`, extraído por `scripts/install-karting-tenerife-source.mjs` de `source/Karting Tenerife.tdrtrack` (foto de 3344×1882). Su integridad se comprueba frente a los bytes embebidos del archivo fuente y el SHA publicado en track.json.
- **Santa Cruz**: ahora usa `public/assets/tracks/santa-cruz/santa-cruz-official.webp`, extraído por `scripts/install-santa-cruz-source.mjs` de `source/Santa-Cruz-x3-nitido.tdrtrack` (3072×4608). Se verifica el mismo vínculo exacto fuente/foto/track.json.
- **Circuito Atlántico**: no existe una foto oficial nativa en su track actual; es un circuito generado. El selector deja de depender de `track01-beauty-preview.webp` y crea la miniatura desde `src/game/tracks/library/track01/track.json` (trazado actual de 106 nodos en 2430×2000), con las texturas PBR actuales `public/assets/materials/asphalt-pbr/aerial_asphalt_01_diff_1k.jpg` y `public/assets/materials/grass/rocky_terrain_02_diff_2k.jpg`, respetando la relación de escala y el ancho real de carretera. Se trata de una composición técnica del juego, **no una imagen de IA ni una foto inventada**.

`predev` y `prebuild` ejecutan primero instaladores de Tenerife y Santa Cruz, además de Américas y Canarias, y después producen las seis miniaturas 900×600 sin referencias legacy. `scripts/track-selector-photos-smoke.mjs` comprueba formatos, pesos, identidades y, específicamente para Tenerife/Santa Cruz, que la foto oficial coincide bit a bit con el segmento WebP original del .tdrtrack. Para Atlántico asegura que se usa su geometría actual en vez del recurso histórico.

No modificar ningún asset del juego de carreras, pista, escala, colisiones, mecánicas, cámara ni Android. La corrección afecta **exclusivamente a las imágenes del selector**. Mantener Build + Deploy verde de HEAD antes de comunicar al propietario que está disponible.
