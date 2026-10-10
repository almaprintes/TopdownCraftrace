# TrackStudio Image Mode — DEV 1.2.101 — Touch usability

Date: 2026-10-10. Branch: `main`.

## Incidencia del propietario
Ajustar la forma era incómodo: resultaba difícil seleccionar el asfalto o los nodos y algunos toques desplazaban un tirador inesperadamente.

## Cambio
- En modo AJUSTAR, primer toque sobre el borde, uno de sus nodos o el interior del asfalto = solo seleccionar; nunca mueve geometría.
- Se muestran nodos únicamente del borde elegido. Ambos contornos siguen visibles; el eje central permanece guardado y sus puntos desaparecen temporalmente de la vista en edición de bordes.
- Segundo gesto sobre el nodo elegido = arrastrarlo. Handles del nodo seleccionado editables individualmente.
- El editor conserva el desplazamiento inicial entre el dedo y el punto, impidiendo el salto del punto al centro del dedo.
- Zonas de selección medidas en píxeles de pantalla y no limitadas incorrectamente a un pequeño radio en unidades del mundo; facilitada selección con zoom reducido.
- Tocar cualquier punto de un borde Bézier o la superficie del asfalto selecciona el nodo de borde correspondiente.
- Un gesto desde una zona vacía del mapa desplaza la vista; dos dedos mantienen zoom y panorámica.
- No se crean nuevos nodos centrales en este modo, aunque el dedo toque la imagen. Se conservan guardado, undo y recuperación.
- El código de reconocimiento de gestos reside en `src/game/scenes/TrackStudioScene.js`; la selección geométrica pura en `src/game/studio/shapeTouchInteraction.js`.

## Validación
`scripts/trackstudio-shape-touch-smoke.mjs` cubre hit-testing por nodo, borde y superficie, tolerancia con zoom, selección previa obligatoria y ausencia de cambios en el eje. Se ejecuta con el pipeline de Pages, junto con los tests de las fases A y B.

No se modifica la publicación pública Google Play 1.1.188 ni se genera APK. La comprobación manual de interacción en iPhone sigue siendo necesaria.
