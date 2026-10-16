# Karting Canarias — nueva fotografía y circuito nativo DEV 1.2.243 (16/10/2026)

**Fuente única:** rama `main`. **Android Google Play público 1.1.188/vc8 no se modifica.** No mezclar los antiguos recursos 2000×4300 con la nueva foto.

## Fuente del propietario y reproducibilidad

El último `trackstudio-image-1792189935586(1).tdrtrack` contiene el trabajo corregido: 506 puntos de `centerline`, contornos con 18 nodos Bézier cada uno, línea de SALIDA y 2 checkpoints, en lienzo **2048×3072**. SHA-256 paquete original: `4327ff06e677431e4b7343f7d5b5e8bd08ea1d0645da75782a1f4afaafed5dc6`.

El JSON interno se conserva exactamente como `src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json`. Su WebP embebido es byte-idéntico a `public/assets/tracks/karting-canarias/karting-canarias-new.webp`, SHA-256 `4472ddf772300318555aad8814ff47da70a759879cca68e66a9f0ca72cac72d2`. Para recuperar el paquete completo: concatenar `TDR-IMAGE-PROJECT-V1\n<bytes del JSON>\n`, JSON crudo y WebP; el script `scripts/install-karting-canarias-source.mjs` comprueba esa integridad en cada build.

Las 4 imágenes de `public/assets/tracks/karting-canarias/photo-R-C.webp` miden 1024×1536 y componen la foto en cuadrícula 2×2, sin texturas gigantes en móviles. `photo-staging.json` ahora marca `published-native`.

## Metas y sectores sin reinterpretar la carretera

El editor exporta un **circuito cerrado** con una única línea `startLine` pero `finishLine=null`. El juego no puede publicar un circuito con `startLine` y `finishLine` independientes porque lo clasificaría como tramo A→B. Por eso el instalador toma la **línea que dibujó el propietario**, manteniendo sus coordenadas, como meta lógica de vuelta (`finishLine`) y establece `startLine:null`; no se dibuja ninguna línea adicional.

Los dos checkpoints del propietario cruzan la centerline en el sentido correcto, se validan y reorientan solo sus normales lógicas según el trazado. Sus distancias sobre la vuelta desde META son aprox. 46,2 % y 79,2 %; no se sustituyen por sectores predeterminados. La salida del coche se coloca en la misma carretera, unos 63 píxeles antes de meta, mirando en el sentido de marcha. `closed:true`, `raceType:circuit`, `checkpointMode:authored`.

Los dos contornos del segundo export ya no se autointersecan; `trackShape` y los 506 puntos de la centerline se copian **sin modificar**. La máscara de conducción usa los límites de la fotografía 1:1, no las viejas celdas generativas.

## Compatibilidad, colisiones y decoración

`src/game/tracks/library/karting-canarias/track.json` pasa a **2048×3072** con `meta.renderMode='image-native'` y cuatro mosaicos. `src/game/tracks/imageNativeRaceLoader.js` controla la carga fotográfica, y `makeKartingShapeMask` determina el asfalto mediante los bordes Bézier exportados.

El entorno antiguo `src/game/tracks/library/karting-canarias/karting-canarias.environment.json`, las decoraciones/guardarraíles históricos `KartingCanariasDividerLayer.js` y el bake `beauty/` **se conservan por motivos históricos**, pero no deben inyectarse en esta carrera con fotografía nativa. El filtro `envFor` de `raceEnvironmentRuntime.js` descarta entornos legacy de circuitos `image-native` que no estén expresamente permitidos, como Karting Canarias. `RaceEnvironmentLayer` y el resto del renderer de foto evitan reinstalar vegetación y asfalto procedural. Las colisiones lógicas de carretera provienen de los dos contornos, no de objetos en escala 2000×4300.

## Validación y mantenimiento

En cada build se ejecuta `scripts/install-karting-canarias-source.mjs` desde `package.json/prebuild`, antes de compilar. Los tests `scripts/karting-canarias-owner-project-smoke.mjs` y `scripts/karting-canarias-photo-staging-smoke.mjs` comprueban geometría, topología, línea de meta, checkpoints, origen del paquete, hashes, cuadrantes WebP y que las colisiones de la foto no utilizan el entorno antiguo.

Para posteriores cambios del propietario: exportar otro `.tdrtrack`; comparar hashes, actualizar JSON original y regenerar el `track.json` con el instalador. **Nunca retocar el `track.json` generado directamente**, ni mezclar archivos Environment Studio dibujados sobre la foto antigua. Aceptación final de sensación de colisión/limpieza visual requiere probar una vuelta real en iPhone/Android.
