# Fase 2026-08-08 — Technical Ridge, selector visual y crafting v1

## 1. Technical Ridge reconstruido

El trazado anterior de `technical-ridge` tenía numerosas autointersecciones visibles en el preview. Se descartó por completo esa geometría.

Se generó una nueva vuelta cerrada técnica a partir de una spline suave con variación radial y se comprobó geométricamente que el centro de pista no contiene autointersecciones.

Regla futura: un circuito nuevo no se considera válido hasta revisar su preview y comprobar que su centerline no se cruza consigo mismo.

Commit base de reconstrucción: `1470409`.

## 2. Nueva selección de circuitos

`TrackGarageFixedScene.js` deja de ser una pequeña corrección del selector antiguo y pasa a presentar una selección visual enfocada a móvil horizontal:

- preview grande del circuito;
- navegación anterior/siguiente;
- swipe horizontal;
- dificultad, longitud y dimensiones visibles sin ruido;
- tira inferior de circuitos;
- selección basada exclusivamente en `trackRegistry`;
- conserva modo jugador y modo admin.

El objetivo es acercar la pantalla al lenguaje visual oscuro/premium del HUD y Workshop, y eliminar la antigua lista estrecha y saturada de texto.

Commits relevantes: `6239b5e`, corrección `d7a7ba5`.

## 3. Crafting / Workshop — fase 1

Ya existía una base interna de materiales, recetas, evolución y piezas, pero estaba poco integrada en la experiencia. Esta fase convierte esa base en un bucle jugable inicial:

**correr → recibir materiales → fusionar → fabricar pieza → equiparla → notar efecto en conducción**.

### Botín de carrera

Al completarse una vuelta válida de Time Trial se concede un botín pequeño:

- 2 drops comunes entre chatarra, aleación, goma, compuesto, disco, muelle y engranaje;
- 10 % de probabilidad adicional de módulo electrónico ECU;
- el último botín puede duplicarse mediante rewarded ad;
- la función de duplicación ahora acepta cualquier material registrado, no solo los tres materiales antiguos.

La recompensa se mantiene deliberadamente pequeña para no romper la economía en circuitos cortos.

Commits relevantes: `6350d87`, integración de recompensa en carrera `fea2984`.

### Workshop visual

`UpgradeShopScene` se rediseña para paisaje/móvil horizontal:

- panel ALMACÉN con pestañas MATERIALES / PIEZAS;
- BANCO DE FUSIÓN central con dos slots claros;
- recetas iniciales visibles;
- panel COCHE / MONTAJE con cinco familias de piezas;
- feedback de fabricación, equipamiento y evolución;
- botón de duplicar botín cuando procede.

Commit: `5815a29`.

### Las piezas ya afectan al coche

`resolveCarParams()` incorpora automáticamente el tuning procedente de las piezas equipadas en el Workshop y lo combina con cualquier tuning externo. De este modo:

- motor modifica aceleración y velocidad máxima;
- frenos modifican fuerza de frenado y grip de frenada;
- neumáticos modifican grip;
- suspensión modifica respuesta de dirección;
- transmisión modifica aceleración.

Commit: `889a644`.

## 4. Alcance deliberado de esta fase

No se pretende todavía construir una economía compleja. Primero hay que probar si el bucle básico resulta divertido y legible.

Pruebas prioritarias:

1. correr una vuelta válida y verificar que aparece botín;
2. entrar en Workshop y comprobar que el inventario aumentó;
3. fabricar una receta básica;
4. equipar la pieza;
5. volver a pista y comprobar que el cambio de comportamiento existe pero no rompe el equilibrio;
6. comprobar que la nueva pantalla de circuitos funciona correctamente en iPhone horizontal;
7. revisar Technical Ridge en preview y en conducción real.

## 5. Deuda técnica

No añadir otra capa/wrapper para estas funciones. La próxima fase de limpieza debe consolidar escenas y quitar implementaciones antiguas que ya no se ejecutan. `trackRegistry` debe seguir siendo la única fuente de verdad de circuitos.
