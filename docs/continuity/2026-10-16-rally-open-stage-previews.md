# DEV 1.2.222 — Rally Arafo → Los Loros: vistas abiertas

**Ámbito:** editor Environment Studio y vista previa de carga de carrera. **Rama:** main. **Google Play:** sin publicar.

## Diagnóstico

La fuente oficial `src/game/tracks/library/rally-arafo-los-loros/track.json` describe correctamente un tramo `closed:false`, `raceType:'stage'`, con 2465 puntos consecutivos y salida/meta independientes. La separación entre los extremos del recorrido supera los 3900 píxeles; todos los saltos entre puntos vecinos son inferiores a 50 píxeles. No hay una línea de retorno en los datos del tramo.

El SVG del loader de carrera en `raceLoadingExperienceV2.js`, `V3.js`, `V5.js` y `V6.js` añadía el comando `Z` incondicionalmente. Esto cerraba el recorrido y dibujaba la diagonal META → SALIDA. Ahora las cuatro capas usan `src/game/tracks/trackPreviewPath.js`: solo los circuitos `closed!==false` se cierran visualmente.

Environment Studio usaba miles de polígonos independientes para dibujar el asfalto del rally. Ahora la rama `isOpen` pinta la ruta como **polilínea abierta única**, con bordes abiertos y marca verde de salida, manteniendo la meta blanca. Nunca llama a `closePath()` en la rama rally. Los circuitos cerrados mantienen su renderer habitual.

Las salidas, metas, cronometraje, colisiones y archivo JSON del rally **no se modifican**. El test `scripts/rally-open-stage-visual-smoke.mjs` protege ambos renderizados y las cuatro versiones del loader.
