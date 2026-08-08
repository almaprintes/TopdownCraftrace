# Forest Loop — selector + geometry fix (2026-08-08)

## Problemas observados

1. El primer trazado de `forest-endurance` se cruzaba consigo mismo y el preview mostraba varias cruces/solapes. No era aceptable como circuito de prueba.
2. Aunque el selector guardaba `forest-endurance`, al entrar en carrera aparecía el circuito habitual.

## Causa del fallo de selección

`TrackGarageScene` guardaba correctamente `tdr2:trackKey = forest-endurance`, pero el `init()` legado de `RaceScene.js` solo consideraba válidas las claves `track01`, `track02`, `track03` y las importaciones `import:*`. Cualquier track nuevo de `trackRegistry` era rechazado y sustituido por el fallback `track02`, además de sobrescribir `localStorage`.

## Solución aplicada

`RaceWideCameraPreviewScene.js` captura la selección real antes de ejecutar el `init()` legado. Tras `super.init(data)`, si la clave existe en `trackRegistry` mediante `hasTrack()`, restaura la clave correcta y vuelve a enlazar el histórico/best lap de Time Trial a ese circuito.

Esto permite añadir nuevos circuitos de biblioteca sin tocar inmediatamente la gran escena legado.

## Geometría nueva

El circuito `forest-endurance` se reconstruyó completamente como `FOREST LOOP`:

- spline cerrada suave;
- sin autointersecciones;
- aproximadamente 17.9k px de longitud geométrica;
- mundo 7400 × 4700;
- ancho base 162 px con pequeñas variaciones;
- mezcla de zonas rápidas y técnicas;
- compatible con el pipeline actual de asfalto, bordes, pianos, vegetación, minimapa y HUD.

## Commits

- `e80f2e3` — reconstrucción del trazado sin cruces.
- `10f60be` — corrección de selección real en carrera.
