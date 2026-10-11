# DEV 1.2.104 — Parrilla de salida opcional en TrackStudio

## Comportamiento
- Meta y parrilla ahora son independientes. Añadir meta a un circuito cerrado no obliga a mantener el dibujo de 20 casillas.
- Botón en el viewport junto a `CREAR PISTA`, `AJUSTAR` y `+ NODO`: **PARRILLA: SÍ / PARRILLA: NO**.
- Tocar el botón cambia el estado, actualiza al instante el dibujo y conserva la línea de meta. Dos rótulos estáticos, nunca `setText()`, para evitar la regresión de WebGL detectada en iPhone.
- La preferencia `showStartingGrid` se guarda en el proyecto y el paquete binario `.tdrtrack`; admite Deshacer/Rehacer y autorrecuperación.
- Al exportar, la parrilla desactivada produce `grid: null` y deja intactos `finishLine`, `centerline`, `trackShape`, `startLine` y los demás datos. El juego conserva el punto de salida de reserva mientras se integra la fase C.
- Los proyectos de TrackStudio antiguos sin campo de preferencia mantienen el comportamiento previo (parrilla activada); las importaciones JSON genéricas sin `grid.slots` respetan su ausencia de parrilla.
- Los tramos `stage` siguen sin parrilla aunque el ajuste estuviera activado.

## Nota sobre el archivo enviado
El archivo `trackstudio-image-1791679093621.tdrtrack` fue revisado localmente, sin modificar. Contiene centerline y geometría editable, pero `editor.finishLine` es `null` en ese respaldo. Colocar la meta visible en el editor y guardar un nuevo `.tdrtrack` es necesario para conservarla.

## Pruebas
`node scripts/trackstudio-start-grid-toggle-smoke.mjs` comprueba las 20 posiciones anteriores, 0 al desactivar, guardado de preferencias, el filtro de exportación y botones sin actualizaciones de texturas.
Despliegue web exclusivo de `main`, no SDK ni APK. Versión Android pública 1.1.188 intacta.
