# Top Down RACE — Arquitectura REAL de circuitos/coches, culling y decisiones de rendimiento

**Investigación estática:** 17/10/2026. **Referencia:** `almaprintes/TopdownCraftrace`, rama única `main`, HEAD `ba138f3953cdd6b331ac3331c1d5befc5d58e2cc`, DEV 1.2.262. **Sin cambios de código**: documento para diseño/continuidad. Contrastado con implementaciones externas; ninguna referencia externa sustituye a la arquitectura local. Google Play Android 1.1.188/vc8 está fuera de alcance.

## PRIORIDAD: no volver a proponer culling dinámico para estas fotografías

**El usuario ya lo probó, con malos resultados. No repetir la misma solución presentándola como novedosa.**

- 23–24/08/2026: se probaron culling por celdas, radio 2/4, lookahead sobre centerline, precarga direccional y restricción del trabajo por celda. Consecuencias reportadas: asfalto apareciendo a destiempo (pop-in), tirones y calentamiento. Historia: commits [80312080](https://github.com/almaprintes/TopdownCraftrace/commit/80312080), [4199ac6c](https://github.com/almaprintes/TopdownCraftrace/commit/4199ac6c), [91a692d3](https://github.com/almaprintes/TopdownCraftrace/commit/91a692d3). Leer [handoff 24/08](2026-08-24-race-performance-beauty-layer.md).
- Un piloto histórico **horneó** el asfalto estático en `RenderTexture`, **destruyó** chunks/overlays/máscaras heredadas y obtuvo, según prueba del propietario, ~60 FPS, ~17–18 ms máximo y menos calentamiento *en esa escena/versión de agosto*. No extrapolar la cifra a las pistas fotográficas de octubre. Implementación histórica: `src/game/scenes/RaceBakedAsphaltScene.js`.
- **06/10/2026, commit [0814314b](https://github.com/almaprintes/TopdownCraftrace/commit/0814314b):** se deshabilitó expresamente el culling de chunks **por fotograma en iOS**, porque materializar/reactivar máscaras introducía stutter. El `RaceScene.js` actual conserva `this._cullEnabled = !isIOSRaceDevice()` y preparación estática limitada, no todo el mundo en memoria de golpe; también hay salvaguarda para etapas grandes como Arafo.
- **Estado de fotografía nativa actual:** en `RaceScene.js` la sección de culling de asfalto empieza con `if (!isImageNativeTrackScene(this) && ...)`: **no se ejecuta para pistas image-native**. `RaceCullAheadScene.js` tiene protección cuando `_beautyLayerActive`. Hay wrappers de culling heredados en la cadena, pero **su existencia no implica que estén renderizando imágenes por celdas**. Inspeccionar guardas activas antes de intervenir.
- **Fotografías:** `src/game/tracks/imageNativeRaceLoader.js` realiza decode PREVIO a `create`, monta 4/6 sprites estáticos de `scene.add.image`, no tiene streaming/carga-descarga de fotos por cámara, y destruye sprites y claves de textura en `shutdown` (mountPhoto). Ocultarlas con `setVisible(false)` no libera GPU. Pueden quedar otras texturas de entorno en cachés distintas: *medir, no afirmar fuga*.

**Decisión de ingeniería:** no incorporar tile streaming, culling por radio, activar/desactivar sprites de mosaicos en cada frame, ni descargar/reconstruir texturas mientras se conduce como próxima optimización. Solo reabrir esa línea si un perfil real demuestra un cuello concreto y un prototipo aislado supera claramente la estabilidad/temperatura, sin pop-in.

## Lo aprendido de repositorios públicos

Se revisaron proyectos públicos (no todo GitHub): [DustRacing2D](https://github.com/juzzlin/DustRacing2D) (mapa de tiles + físicas off-track; GPL-3.0), [Hot Wheels Phaser 3](https://github.com/itsbirdo/hotwheels) (tiles de carretera + waypoints), [TDRace](https://github.com/magomar/tdrace) (anchura de carretera asociada a spline en unidades métricas, geometría estática agrupada en lotes de 64 segmentos), [phaser3-matterjs-car](https://github.com/ankit-4129/phaser3-matterjs-car) (chunks de un mundo de desplazamiento), [godot-race-rl](https://github.com/elarry/godot-race-rl) (imagen con clasificación física de superficie).

**Ideas transferibles sin copiar código:** geometría lógica separada de representación; anchura local del tramo independiente de la textura; preparar recursos estáticos fuera del loop; distinguir espacio físico de píxeles de imagen; renderizar sin repetir arte de la carretera. **No trasplantar** streaming de mundo abierto, carreteras de tiles repetitivos (no respetan la fotografía realista), detección de césped por color, ni código GPL/otras licencias sin revisar. Licencia de TDRace no verificada aquí: referencia conceptual, no dependencia.

## Fuentes de verdad y flujo de build

1. `src/game/tracks/trackUnlocks.js` define `PUBLISHED_TRACK_IDS` (6): `circuito-atlantico`, `santa-cruz`, `karting-tenerife`, `karting-canarias`, `karting-americas`, `rally-arafo-los-loros`. Solo estos se muestran/desbloquean normalmente; otros JSON del registro son históricos o evaluación.
2. `src/game/tracks/trackRegistry.js` hace `import.meta.glob('./library/*/track.json',{eager:true})` y normaliza `worldW/worldH`, `carScale`, `trackWidth`, `centerline`, puertas, campos visuales y campos de física. Alias `track01` -> `circuito-atlantico`.
3. **Muy importante:** los `track.json` del checkout Git pueden estar **antiguos**. `npm run prebuild` / `.github/workflows/pages.yml` ejecutan primero los instaladores desde archivos maestros, ANTES de compilar Vite: `scripts/install-karting-tenerife-source.mjs`, `install-santa-cruz-source.mjs`, `install-karting-americas-source.mjs`, `install-karting-canarias-source.mjs`, `install-circuito-atlantico-source.mjs` y generación de `*-ios.webp`. **No presentar un `track.json` histórico de Git como estado publicado.** Las métricas finales deben extraerse del **resultado post-instalación/prebuild**, sin sobrescribir originales en el estudio.
4. El `.tdrtrack` maestro contiene geometría y fotografía embebida; está bajo `src/game/tracks/library/<slug>/source/` (Canarias conserva un JSON de proyecto+WebP con comprobaciones de SHA). No modificar a mano los JSON instalados: se regeneran. Guardar hashes de fotos y datos de Track Studio.
5. `src/game/game.js` registra la carrera real bajo `race` con clase `RaceEmbeddedReplaySceneV2` y le instala por composición `installRaceEnvironmentRuntime`, `installRaceGraphicsBudgetRuntime`, `installExactRuntimeBeautyPass`, `installRaceLoadingExperience`, `installLiveDeltaReferenceRuntime` e `installImageNativeRaceLoader`. **Cadena larga de herencia ≠ escenas simultáneas**. `RaceTelemetryHudScene` sustituye HUD Phaser antiguo por DOM; no optimizar HUD muerto esperando mejoras.
6. La máscara carretera/hierba en fotografía viene de `trackShape` Bézier (`makeKartingShapeMask` o `makeOpenStagePhotoMask` para A→B) y las colisiones de Environment Studio son datos independientes. No usar WebP como máscara física ni reinyectar capas antiguas.

### Inventario de seis pistas: leer parámetros *generados* al hacer el siguiente estudio

| ID | Foto maestra | Mundo configurado post-instalación | Bloques foto | carScale publicado |
|---|---:|---:|---:|---:|
| circuito-atlantico (track01) | 4344×3258 | 4344×3258 | 6 | 1 |
| santa-cruz | 3072×4608 | 3072×4608 | 6 | 1 |
| karting-tenerife | 3344×1882 | 3344×1882 | 4 | 1 |
| karting-canarias | 2048×3072 | **5120×7680** (factor mundo 2,5) | 4 | 1 |
| karting-americas | 2862×3435 | 2862×3435 | 6 | 1 |
| rally-arafo-los-loros | 1882×3344 | 1882×3344 | 4 | **0,35** |

Los tamaños declarados derivan de instaladores/fuentes en `main`; comprobar el artefacto post-prebuild antes de usar números para editar. Canarias tiene `src/game/tracks/kartingCanariasWorldScale.js`: aplica ×2,5 **conjuntamente** a centerline, Bézier, distancias de geometría, puertas y entorno, pero NO escala los coches ni sus físicas y NO aumenta resolución real del WebP. **No dar por supuesto que es solo un cambio óptico**. Arafo aplica `carScale` 0,35 tanto al dibujo del coche como al radio de colisión, vía `RaceScene.js`.

## Cómo se escalan realmente coches y carreteras

- `src/game/cars/carSpecs.js` define `visualScale` por vehículo. `BootScene` ejecuta `applyCarOverrides` con `community/car-overrides.json`: consultar overrides efectivos, no solo `carSpecs.js`. Cuper y Juanicar tienen `collisionScale` separada para mantener hitbox. Cuper depende además de los WebP verificados por `scripts/detect-cuper-assets.mjs`.
- En `RaceScene.js` (sección de creación del coche), sprite se ajusta uniformemente dentro de la caja `(96×48) * visualScale * 1.35 * trackCarScale`; se conserva relación de aspecto, que también determina tamaño efectivo. El cuerpo físico aplica `setCircle(round(14 * collisionScale * trackCarScale))`. **Una homogeneización de `trackCarScale` cambia colisiones salvo separación explícita; no hacerlo a ciegas.**
- `src/game/cars/speedUnits.js`: la física usa píxeles del mundo (`px/s`); `KMH_PER_PXPS = 0.185`, `METERS_PER_PX = 0.185/3.6`. Cambiar escala del mundo sin analizar kilómetros, longitud de vuelta, PB, fantasmas, tiempos publicados, gates y conducción cambia significado físico.
- `src/game/tracks/raceCameraZoom.js` actualmente devuelve factor **1** para todos: el viejo `0.84` exclusivo de Canarias se deshizo al aplicar mundo ×2,5 ([be9e1fbf](https://github.com/almaprintes/TopdownCraftrace/commit/be9e1fbf)). El zoom dinámico en `RaceScene.update` **multiplica por igual carretera y coche**; NO cambia la proporción entre ambos. Corrección del propietario a la recomendación anterior: **no justificar tamaños relativos por zoom**.
- Homogeneizar quiere decir **calibrar coche/carretera en unidades físicas coherentes**, no hacer todas las carreteras igual de anchas ni igualar visiblemente camión y deportivo. Nunca redimensionar foto después de trazar Bézier sin trasladar todo el sistema correspondiente y versionar datos/records.

## La pixelación y el calor actuales no se curan necesariamente bajando resolución

- `src/game/performance/iosPhotoTileBudget.js` usa `IOS_PHOTO_TILE_SCALE = 0.65`: cada mosaico iPhone es 65 % por lado (**42,25 % de texeles**, no 65 % de superficie); `scripts/build-ios-race-photo-tiles.mjs` usa resize Lanczos3 + WebP calidad 78. `imageNativeRaceLoader.js` **amplía el sprite** hasta conservar dimensiones originales en mundo. Esta es una pérdida comprobada de detalle disponible, no una prueba de fuga GPU.
- Estas variantes fueron introducidas el 17/10 como **mitigación posterior** a los tirones; el propietario reporta pixelación y el stutter persiste. Nunca volver a proponer bajar a 50 %, reducir más fotos o acercar/alejar cámara como solución a la nitidez.
- `src/game/performance/iosRaceRenderBudget.js` restringe framebuffer en iPhone compacto de anchura mínima <=430 (HIGH=1.0, ULTRA=1.5), pero el runtime de iPhone de la prueba informó HIGH=1.5: ese cap **no se estaba aplicando** en dicho escenario. FPS limit 0, SAFE NO, TIMER NO. No afirmar que HIGH equivale siempre a resolution 1 sin mirar dispositivo/UA. WebGL `desynchronized` está solicitado, pero su atributo real salía NO DISPONIBLE.
- La textura GPU se mide por ancho×alto×bytes por píxel (aprox. RGBA8), NO por kilobytes WebP. `setVisible(false)` no libera la textura. El cambio de imágenes completo exige evaluar headroom y ciclo de vida **sin upload durante la conducción**.
- El móvil del propietario se calentó considerablemente. No exigir sesiones largas ni más pruebas sin causa/hipótesis acotada; revisar primero arquitectura y artefactos sin dispositivo.

## Experimentos recientes ya realizados (NO repetir sin hipótesis nueva)

- DEV 1.2.252/253: carga fotográfica directa en bloques, ahorro de memoria en iOS, y eliminación de decoración procedural redundante. **Tirones continuaron**.
- DEV 1.2.254/255: recortar actualizaciones de HUD y escaneo antiguo. Cambios limitados; parte de HUD Phaser ya se destruye en escena final; **no solucionaron**.
- DEV 1.2.256: odómetro OFF; **no solucionó**.
- DEV 1.2.257: MEDIR aisló UPDATE/RENDER CPU bajos, mucho intervalo restante; no confundir "OTROS" con tiempo GPU o CPU consumido.
- DEV 1.2.258: A/B WebGL SYNC/DESYNC disponible; sin comparación convincente aún, no revertir DESYNC previamente apreciado sin A/B.
- DEV 1.2.259/260: audio WebAudio suspendido de verdad. Pruebas variables y mejoras visuales mayormente al ocultar HUD/foto; audio **no confirmado como causa principal**.
- DEV 1.2.261: reemplazado el RAF global de DELTA/PAUSA y reducido DOM Ghost; propietario **no percibe mejora**.
- DEV 1.2.262: A/B puente HTML vs Phaser: captura HTML ~49,9 FPS / 97 ms max; Phaser ~38,9 FPS / 187 ms max; **no sustituir HTML por Phaser para ganar FPS**. Son ventanas diferentes, no experimento estadístico, pero el usuario reporta tirones y calor.
- El 28/08 ya se probaron cambios de suavizado de Phaser, MSAA, cámara, batching, rAF/main watchdog y `desynchronized`: leer [investigación 28/08](2026-08-28-ios-render-stutter-investigation.md). No redescubrirlos como soluciones nuevas.

## Siguiente trabajo sensato (SIN cambiar runtime todavía)

1. **Inventario post-build automatizado y de solo lectura:** reconstruir los seis JSON de los instaladores en entorno aislado, medir anchura de asfalto en varios sectores desde los Bézier, relaciones `coche/ancho disponible` por los 18 vehículos, `carScale`/hitbox, pixel density/foto, formatos y RGBA por bloque, transformaciones `editor -> mundo -> pantalla`. Tomar `Spark + Tenerife` como **referencia comparativa**, no imponer una anchura universal. Marcar excepciones justificadas de karting, rally y ciudad.
2. Detectar discrepancias entre geometría exportada, fotografía y escala física antes de normalizar. Distinguir *tamaño visual de coche* del radio físico; que no se toque ninguno sin plan de compatibilidad de récords. Los proyectos de edición originales y pistas publicadas NO se modifican en esta fase.
3. **Diseño sin streaming**: conservar bloques estáticos precargados por carrera; medir textura/composición/CPU con Safari Web Inspector y contadores *al entrar/salir*, no 60 veces por segundo. Buscar primero recursos redundantes u objetos activos de UI/legado; inventario de variación de heap, GL textures y estado thermal real. No proponer culling ya fallido.
4. Al decidir un ajuste gráfico, comparar nitidez de WebP original a escala de cámara y tamaño de pantalla; estimar GPU RGBA y descargas. Cualquier variante futura de resolución completa debe cargarse **antes** de carrera y validar memoria, no upload/asignación de texturas durante curvas.
5. Separar cambios físicos (requieren migración/versionado de datos online/ghosts) de cambios de apariencia. PRUEBAS offline primero, PWA DEV con Actions verde solo cuando exista cambio de código; Google Play no tocar.

## Referencias internas prioritarias

- `AGENTS.md`, `.github/workflows/pages.yml`, `PROJECT_HANDOFF.md`.
- `docs/continuity/2026-08-24-race-performance-beauty-layer.md` (culling/popup/bake); `2026-08-28-ios-render-stutter-investigation.md` (rAF/WebKit/retornos de experimentos).
- `docs/trackstudio-image-native-reproducible-workflow.md` (fuente original, rechazo de mundo×3 global y físicas especiales).
- `docs/continuity/2026-10-16-karting-canarias-photo-active.md` (motivo original de escala y supresión de zoom como workaround).
- `docs/continuity/2026-10-17-ios-all-tracks-stutter.md`, `2026-10-17-iphone-text-bridge-ab-262.md` (evidencia octubre).
- `src/game/tracks/imageNativeRaceLoader.js`; `src/game/tracks/trackRegistry.js`; `src/game/tracks/trackUnlocks.js`; `src/game/tracks/kartingCanariasWorldScale.js`; `src/game/scenes/RaceScene.js`; `src/game/cars/carSpecs.js`; `src/game/cars/speedUnits.js`; `src/game/game.js`.

**Estado:** sin diagnóstico probado de la causa de tirones iPhone, ni conformidad de escala, ni prueba de GPU. No afirmar 60 FPS, no modificar render/escala/física sin encargo concreto. Documentación histórica es contexto, **el código de main y los artefactos generados mandan**.
