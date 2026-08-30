# Top Down RACE — cofre de sesión y layout móvil — 2026-08-30

## Problemas observados en dispositivo

En iPhone, la ventana `SESIÓN FINALIZADA / COFRE DE 5 VUELTAS` mostraba correctamente el marco de tarjeta FREE, pero el centro quedaba vacío después de eliminar el antiguo rombo placeholder. Además, las recompensas ocultas seguían ocupando espacio porque solo tenían `opacity:0`, de modo que el modal crecía, dejaba una gran zona vacía y obligaba a hacer scroll para alcanzar el botón.

## Cofre visual

Se mantiene el marco oficial de Season Pass `assets/season/reward_cards/free_*.svg` y se coloca dentro de él el asset gráfico existente `public/assets/store/daily_gift.webp`, en lugar de volver a dibujar un símbolo geométrico. No se genera arte nuevo.

Los materiales continúan leyendo exclusivamente los WebP canónicos de `GARAGE_ITEMS`.

## Layout cerrado / abierto

`raceSessionUi` pasa a tener dos estados de layout explícitos:

- `is-closed`: solo ocupa espacio el encabezado, tarjeta/cofre y llamada `TOCA PARA ABRIR`; el bloque completo de recompensas usa `display:none` y por tanto no reserva altura invisible.
- `is-open`: la tarjeta grande se retira del flujo y aparece el resumen de piezas, grid, chips y botón de informe.

La apertura conserva una transición corta y el reveal escalonado de piezas, pero ya no depende de elementos transparentes ocupando espacio.

## Móvil horizontal

Se añade una variante compacta para `orientation:landscape` con altura <= 650 px: márgenes y paddings menores, tarjeta más pequeña, piezas de 28 px y botón de 32 px. `overflow:auto` queda solo como red de seguridad para pantallas excepcionalmente pequeñas; una sesión normal de cinco recompensas debe caber completa sin scroll.

## Red de seguridad

`scripts/session-reward-assets-smoke.mjs` comprueba ahora el asset de cofre existente, los estados cerrados/abiertos, que los bloques ocultos salgan del flujo y que exista la variante compacta landscape, además de seguir verificando los ocho assets oficiales de materiales.

## Alcance

No cambia economía, cantidades, probabilidades, premios, lógica de vueltas ni física. Es una corrección exclusivamente visual y de layout DOM.
