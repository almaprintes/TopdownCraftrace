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


## DEV 1.2.244 — cámara de carrera más abierta, solo Karting Canarias

El propietario solicita que la nueva pista se vea con más entorno y que el coche ocupe menos pantalla, **sin tocar vehículo, potencia, físicas, colisiones, ancho ni coordenadas 1:1**. Se incorpora `src/game/tracks/raceCameraZoom.js`: para el identificador exacto `karting-canarias`, la cámara usa `0.84 × zoom dinámico normal`; para cualquier otro circuito, `1.00 ×` sin cambios.

IMPORTANTE: el motor de carrera recalcula el zoom en `RaceScene.update()` según velocidad, entre los límites definidos por `RaceWideCameraPreviewScene`. Por eso se adapta **el objetivo dinámico de cada frame** antes de su interpolación y no se añade un `setZoom(0.84)` aislado que el update sobrescribiría. El efecto en pantalla es un encuadre un 16 % más abierto respecto al zoom que corresponda a cada velocidad; ni el sprite del coche ni el mundo físico cambian.

Al revisar `RaceWideCameraPreviewScene.create()` se confirmó que el código aún intentaba instalar `installKartingCanariasDividers(this)` sobre la foto nativa, a pesar de que su geometría histórica no corresponde al mundo 2048×3072. Se rodea la instalación con `this.track?.meta?.renderMode !== 'image-native'`. Los circuitos clásicos y sus barreras antiguas conservan el mismo comportamiento.

`scripts/karting-canarias-camera-zoom-smoke.mjs` verifica que el factor solo afecta a Canarias a velocidades mínima, intermedia y máxima; comprueba el código de interpolación dinámica, que el circuito conserva su geometría de origen y que los divisores legacy no se instalan en la fotografía. Incluido en `npm run prebuild` y GitHub Pages.

**Limitación óptica conocida:** alejar la cámara reduce en pantalla tanto el coche como la carretera en la misma proporción. Si se requiere aumentar realmente el ancho relativo del asfalto frente al coche, hay que transformar en una iteración independiente el lienzo, la geometría y todas las puertas/colisiones a un mundo mayor, manteniendo la escala del vehículo. No se hace en esta versión porque se pidió explícitamente la alternativa de zoom 0,84 y no tocar el trazado.


## DEV 1.2.245 — colisiones nuevas de Environment Studio

Archivo del propietario: `karting-canarias.environment(3).json` (export esquema 7, mundo de la nueva foto 2048×3072). Se ha sustituido **íntegro y sin alterar sus vértices** en `src/game/tracks/library/karting-canarias/karting-canarias.environment.json`. SHA-256 original del JSON: `8ee5ca3f1b6e71baa3f87fd6d420e1d9c3c95e92101831c89c1455a535d59654`.

Contenido: 5 barreras invisibles de pluma Bézier (19 nodos; `halfThickness=9`) y 1 zona sólida cerrada (17 vértices). Sin nuevas texturas de entorno, pianos visuales ni materiales. Se comprobó que el polígono es simple y no cubre la trayectoria central, la salida ni los checkpoints; todos los trazos están dentro de la imagen y sus distancias a la centerline son mayores de 35 px. Estos cálculos no sustituyen a un ensayo de conducción real en los estrechamientos.

**Activación fundamental:** `src/game/scenes/raceEnvironmentRuntime.js` excluía de forma intencionada a Karting Canarias de la lista de entornos oficiales `image-native` para protegerlo de las viejas colisiones 2000×4300. Con el nuevo export, esa excepción ya no corresponde: se permite **solo** `karting-canarias` como circuito fotográfico oficial, manteniendo las previews locales excluidas. El código existente convierte las cinco plumas mediante `sampleCollisionLine`, compila el área con `compileCollisionZone` y resuelve choques del jugador y de las IA. La barrera histórica de `KartingCanariasDividerLayer` sigue desactivada en pistas `image-native`, evitando doble colisión.

`scripts/karting-canarias-owner-environment-smoke.mjs` protege los bytes exactos, dimensiones, identidades, número de líneas/nodos/vértices, geometría válida, ausencia de obstáculos en línea central, carga de entorno y separación de barreras antiguas. Ejecutado en prebuild y GitHub Pages. No tocar ni la fotografía, ni los 506 puntos de trazado/forma, ni el factor de cámara 0.84 de la DEV 1.2.244, ni ningún parámetro de coche.
