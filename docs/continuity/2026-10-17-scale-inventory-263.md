# DEV 1.2.263 — Auditoría automatizada sin cambios de gameplay

Referencia: main d763c25209a1713700eb95bfaabb6c54b26288e8 (antes de commit). Se añade `scripts/audit-track-car-scale.mjs` para ejecutarse tras el prebuild de instaladores: genera `INFORME.md` e `inventory.json` con los seis circuitos publicados y los coches oficiales (incluyendo overrides JSON). Estima anchuras por corte normal de bordes Bézier y reporta cobertura: NO afirmar medida precisa si hay ramas cercanas o cruce ambiguo. Toma escala física e imagen del `track.json` POST instalador; utiliza la foto original para cálculo RGBA4 y la variante iOS al 65 %. Incluye relación visual anchura corta del sprite predeterminado/ancho de asfalto, radio físico y escala por circuito. Zoom no altera esa proporción.

Guía: GitHub Actions Build > Inventariar escalas ... > artefacto `TDR-track-car-scale-audit` (INFORME.md, inventory.json). Localmente `npm ci && npm run prebuild && npm run check:scale-inventory`.

Los assets de skins pueden tener arte sin alfa recortado; medidas por canvas sprite no son necesariamente longitud física de un turismo, y skins equipadas no se pueden adivinar. Ningún cambio a culling, fotos, canvas, runtime de carrera, colisiones, temporizador, Android o Play Store. La única versión nueva es la etiqueta DEV 1.2.263.
