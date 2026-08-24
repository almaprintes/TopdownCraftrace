# 2026-08-24 — Exact runtime asphalt beauty pass

## Estado confirmado

La validación roja demostró que `track.geom.left/right` coincide con el borde visual exacto del asfalto de Karting Tenerife. Esa geometría queda congelada como fuente de verdad para el render del firme.

## Cambios aplicados

- `src/game/game.js` vuelve a usar `RaceWorldAlignedMaterialsScene` como `RaceScene` activa normal.
- `RaceDebugRedMaskScene` deja de formar parte del runtime activo.
- Se añade `src/game/scenes/raceExactRuntimeBeautyPass.js` como instalación visual sobre `RaceWorldAlignedMaterialsScene`.
- La máscara del asfalto se construye directamente con los arrays runtime `track.geom.left/right`, usando exactamente un quad entre cada pareja consecutiva de muestras.
- No existe expansión, offset, grow, reconstrucción offline ni reinterpretación de la geometría.
- El asfalto usa `assets/materials/asphalt-real.webp` en world-space, con una segunda pasada multiescala para romper repetición, detalle tonal sutil y goma acumulada.
- La línea blanca se dibuja centrada en el borde validado y se recorta con la misma máscara; solo queda visible su mitad interior, de modo que no ensancha el asfalto.
- Se añade una franja de tierra/suciedad exterior dibujada por debajo del asfalto. La parte interior queda tapada por la máscara exacta y solo sobrevive el borde exterior.
- El césped recibe una segunda pasada world-space muy suave usando el material real existente para ganar riqueza sin sustituir la lógica de terreno.
- Los pianos y props siguen siendo los existentes; no se altera su lógica ni sus superficies.

## Debug rojo retirado

`trackBeautyLayers.js` desactiva el bake `debug-red` de Karting Tenerife. Los tiles rojos dejan de cargarse y mostrarse en carrera. El asset de validación puede permanecer en el historial/repositorio, pero no interviene en el runtime normal.

## Guardrails

No tocar como consecuencia de este pass:

- físicas;
- IA;
- checkpoints;
- cronometraje;
- `track.geom`;
- detección de superficies;
- anchura lógica de pista;
- pianos como superficie;
- colisiones.

El módulo nuevo es exclusivamente de render. Si falla, registra warning y conserva el render base de la escena.

## Target visual

La dirección de acabado es la de las referencias aportadas el 24/08/2026: asfalto fotográfico y no plano, línea blanca integrada, suciedad acumulada inmediatamente fuera del firme, césped con variación y pianos gastados, manteniendo siempre el borde exacto ya validado.
