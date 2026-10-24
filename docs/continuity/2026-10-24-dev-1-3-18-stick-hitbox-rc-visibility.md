# DEV 1.3.18 — Palanca visible interactiva y áreas RC ampliadas

## Incidencia y evidencia
El propietario compartió una captura de carrera en iPhone con el **stick circular antiguo en el lado izquierdo y pedales GAS/FRENO antiguos en el derecho**, no las dos palancas rectilíneas RC. Indica «La palanca se ha hecho muy chiquitita el área y no se mueve». La captura no permite saber qué modo estaba seleccionado en Ajustes; sí muestra que el modo RC no estaba representado visualmente en ese instante.

## Diagnóstico del código
El stick tradicional vive visualmente en DOM (`src/main.js`, `.tdr-stick`) y se sitúa con `applyDomControlLayout` y escalado; su input previo se recibía en Phaser mediante un radio y un centro calculados aparte (`RaceControlSchemeScene._createCustomStickTouchControls`). Eso permite discrepancias entre el centro visual real y la región que responde a la pulsación/arrastre, especialmente con ajustes de tamaño/posición del usuario. En modo RC hay además un `tick` global que cambia visibilidad del stick antiguo según el modo de botones pero no considera `rc_twin`.

## Solución
- `src/game/controls/domStickPointer.js`: puente de Pointer Events directamente sobre el elemento **DOM visible** del stick clásico; usa el `getBoundingClientRect()` real como referencia, captura exclusivamente su pointerId, permite arrastre simultáneo del otro pulgar, centra al `pointerup`, `pointercancel` y `lostpointercapture`, y desregistra los manejadores al cerrar escena. Conserva la trayectoria relativa de pulgar al iniciar arrastre (sin saltos).
- `RaceHandbrakeScene.js`: instala el puente solo cuando `_tdrSteeringMode==='stick'`, **nunca** RC, wheel, buttons o gamepad. No modifica los controles físicos ni el algoritmo de dirección del coche.
- `src/main.js`: palanca circular visible crece de `clamp(142px,17vw,190px)` a `clamp(190px,21vw,236px)`. El monitor visual global trata explícitamente `race._tdrRcMode` y oculta stick/pedales clásicos en modo RC con propiedades `display` de prioridad `important`, restaurando cuando cambia el modo.
- `RaceRcTwinAxisScene.js`: área visible/táctil de palanca RC horizontal `215–290px × 145–188px`; RC vertical `118–150px × 208–260px`; escala incluida en `transform` para que su caja táctil DOM real corresponda a tamaño visible incluso con personalización. No temporizadores ni trabajo por fotograma nuevo.
- CI `scripts/race-visible-control-hitbox-smoke.mjs`: prueba simulada de DOM y gestos, aislamiento del segundo dedo, restablecimiento al soltar y verificación de modo RC/estilos. Se conserva el smoke RC 1.3.17 y demás verificaciones.

## Estado
DEV **1.3.18**, rama `main`, solo PWA. No APK/AAB ni publicación Play. Verificar flujo GitHub Pages (build, deploy y SHA público). Prueba humana pendiente: primero seleccionar **Ajustes → Controles → RC · 2 PALANCAS**, comprobar que aparecen exclusivamente las dos barras, conducir con ambos dedos y freno de mano; luego seleccionar **PALANCA** y comprobar círculo táctil grande y arrastre real, incluidas configuraciones personalizadas y mano zurda. No dar por evaluada la comodidad hasta la prueba en iPhone.
