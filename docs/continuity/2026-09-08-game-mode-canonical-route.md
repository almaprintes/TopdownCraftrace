# Selector canónico de modos de juego — 2026-09-08

## Ruta real usada por el juego

La UI visible del selector de modos (carrusel con tarjetas, flechas y puntos) está implementada en:

`src/game/scenes/MenuGameModeSnapScene.js`

La cadena activa del menú llega a esa escena desde la escena superior actualmente cargada por el juego (`MenuStoreCloseFixScene.js` hereda de esta cadena). Por tanto, cualquier alta/baja visual de modos en el carrusel debe realizarse en `MenuGameModeSnapScene.js`, concretamente en `MODES`.

## Regla para evitar regresiones

- No asumir que un selector antiguo o una clase base sigue siendo la UI efectiva.
- Antes de tocar un menú visible, verificar la cadena de herencia/importación que termina cargando `game.js`.
- Para el selector de modos 1.0, `MenuGameModeSnapScene.js` es la referencia canónica visual.
- Supervivencia permanece en el código del juego para futuro uso, pero está retirada del array `MODES` de esta UI y no debe mostrarse en la versión 1.0.
- No borrar assets ni lógica interna de Supervivencia por esta retirada visual.

## Motivo

Se detectó que coexistían rutas históricas/antiguas de selección de modo. Una modificación realizada sobre una ruta no activa no afectó al carrusel realmente visible. Esta nota existe para evitar repetir ese error.
