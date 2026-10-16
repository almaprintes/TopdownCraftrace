# DEV 1.2.222 — Rally Arafo → Los Loros: vistas abiertas

**Ámbito:** editor Environment Studio y vista previa de carga de carrera. **Rama:** main. **Google Play:** sin publicar.

## Diagnóstico

La fuente oficial `src/game/tracks/library/rally-arafo-los-loros/track.json` describe correctamente un tramo `closed:false`, `raceType:'stage'`, con 2465 puntos consecutivos y salida/meta independientes. La separación entre los extremos del recorrido supera los 3900 píxeles; todos los saltos entre puntos vecinos son inferiores a 50 píxeles. No hay una línea de retorno en los datos del tramo.

El SVG del loader de carrera en `raceLoadingExperienceV2.js`, `V3.js`, `V5.js` y `V6.js` añadía el comando `Z` incondicionalmente. Esto cerraba el recorrido y dibujaba la diagonal META → SALIDA. Ahora las cuatro capas usan `src/game/tracks/trackPreviewPath.js`: solo los circuitos `closed!==false` se cierran visualmente.

Environment Studio usaba miles de polígonos independientes para dibujar el asfalto del rally. Ahora la rama `isOpen` pinta la ruta como **polilínea abierta única**, con bordes abiertos y marca verde de salida, manteniendo la meta blanca. Nunca llama a `closePath()` en la rama rally. Los circuitos cerrados mantienen su renderer habitual.

Las salidas, metas, cronometraje, colisiones y archivo JSON del rally **no se modifican**. El test `scripts/rally-open-stage-visual-smoke.mjs` protege ambos renderizados y las cuatro versiones del loader.

## DEV 1.2.223 — corrección del renderizador largo de Environment Studio

Tras la DEV 1.2.222, una captura real confirmó que el cierre de la pantalla de carga estaba corregido, pero **Environment Studio seguía dibujando una diagonal entre salida y meta**. El editor aún usaba `Graphics.strokePath()` con los 2465 nodos en un trazo único; aunque no había `closePath()` explícito, el resultado en pantalla no respetaba el recorrido abierto.

Se sustituye la carretera y ambos bordes por `drawOpenStageRoad()` en `src/game/tracks/openStageRoadRenderer.js`. El renderizador emite `lineBetween` **exclusivamente entre puntos consecutivos**, sin iteración circular ni cerrar la geometría. Se valida el tramo original completo con un Graphics falso: 2464 segmentos por cada una de las 3 franjas (carretera y bordes), todos cortos y ninguno entre la última y la primera coordenada. Se mantiene la marca verde de salida y meta blanca. No se alteran geometría oficial, colisiones, carrera, checkpoints ni imágenes.

## DEV 1.2.224 · Diagnóstico de la persistencia de la diagonal

El usuario confirmó que seguía igual tras las correcciones estáticas. Se incorpora una etiqueta de diagnóstico SOLO al editar tramos abiertos; muestra DEV real cargada, tipo A→B, puntos, salto máximo de su centro de pista, número de superficies de editor y escenas activas. Esto permite comprobar en el propio dispositivo si se está ejecutando código nuevo y si hay superposición o superficies heredadas. Environment Studio además detiene otras escenas de carrera/Track Studio que permanezcan activas detrás del editor (no borra archivos ni borradores). **No afirmar que la diagonal ha quedado resuelta sin prueba visual; solicitar captura con la etiqueta.**
