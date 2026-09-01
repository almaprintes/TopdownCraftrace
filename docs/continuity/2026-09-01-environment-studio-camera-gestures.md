# Environment Studio — cámara y gestos (2026-09-01)

## Problema observado
En iPhone, el lienzo del Environment Studio era difícil de encuadrar: el pinch zoom podía desplazar el circuito de forma impredecible, algunas zonas quedaban fuera del área útil y el paneo con un dedo no respetaba correctamente las dimensiones reales de cada circuito.

## Causas confirmadas
- `EnvironmentBuilderFreePanScene.js` limitaba el paneo con dimensiones fijas de 8000×5000, aunque los circuitos reales pueden usar otros tamaños de mundo.
- `EnvironmentBuilderPinchAnchorScene.js` permitía alejar hasta `0.012x` y desactivaba temporalmente los límites de cámara durante el pinch, permitiendo que el mapa escapara fuera del mundo editable.

## Corrección
- El paneo usa ahora los bounds reales de `_editCam` y, como fallback, `_editorWorldW/_editorWorldH`.
- El pinch calcula un zoom mínimo dinámico a partir del tamaño real del mundo y del viewport.
- El punto situado entre los dos dedos sigue siendo el ancla del zoom.
- La cámara se limita al mundo real en cada frame del gesto, no solo al terminar.
- Ya no se desactivan los límites de cámara durante el pinch.
- El gesto de escala/rotación de assets seleccionados se mantiene intacto.

## Commits
- `da59c3a783926ad9cce94666ffecce2cbd9a92fc` — límites de paneo por circuito.
- `6e4235ce0939c5f8261da582cfff26365640c924` — pinch zoom estable y anclado.

## Validación pendiente
Probar en iPhone horizontal: zoom hacia una curva concreta, desplazamiento a las cuatro esquinas del circuito, zoom máximo/mínimo y transición entre mover mapa y manipular un asset seleccionado.
