# Top Down RACE — continuidad: recompensas de sesión

Fecha: 17/08/2026

## Flujo activo

La escena de carrera activa se carga desde `src/game/game.js` mediante `RaceSessionRewardsScene.js`, que extiende `RaceLootEconomyScene.js`.

## Decisiones consolidadas

- Los cofres NO deben abrirse durante la conducción ni pausar una tanda.
- El jugador termina voluntariamente una tanda desde el menú de pausa mediante `FINALIZAR SESIÓN`.
- `ABANDONAR SESIÓN` sigue siendo una salida separada sin representar el cierre normal de la tanda.
- Al finalizar se presenta el botín acumulado y después el informe/resultados.
- La economía original se mantiene: cada vuelta premiada conserva sus drops y cada múltiplo de 5 conserva su bonus de cofre.
- Visualmente ya no se muestran muchos cofres. Se consolida toda la sesión en un solo cofre de categoría calculado por `floor(vueltasPremiadas / 5) * 5`:
  - 5–9 vueltas → cofre de 5 vueltas.
  - 10–14 → cofre de 10 vueltas.
  - 15–19 → cofre de 15 vueltas.
  - etc.
- El cofre cambia de tratamiento visual según sube de categoría, pero las recompensas ya concedidas no se recalculan ni se pierden.
- La ventana final incluye botón de cierre y botón para avanzar al informe/resultados.
- Mientras la ventana final está abierta se desactiva `Phaser.Input`, se anulan eventos del canvas y se ocultan otros DOM de carrera para impedir pulsar controles situados detrás (incluido el control de vuelta rápida observado en pruebas).

## Archivos relevantes

- `src/game/scenes/RaceSessionRewardsScene.js`
- `src/game/scenes/RaceLootEconomyScene.js`
- `src/game/garage/garageStore.js`
- `src/game/game.js`

## Commits relevantes

- `ebca026fa5006df238c923d89fa83c6faf1b091f` — Add controlled session finish and deferred rewards
- `ed1b7999688b7568438e9683dd9d88d782c2cda6` — Use controlled session rewards race scene
- `795b70ff3ed3607d6e9cab20100e1f78c20099ed` — Consolidate session chests and lock reward modal input
- `74c0fecf8c8813e51ca924fcc0796eeb573ffd10` — Keep reward modal controls interactive

## Prueba inmediata recomendada

1. Completar 10–14 vueltas premiadas.
2. Confirmar que no aparece ningún cofre durante la carrera.
3. Pausa → `FINALIZAR SESIÓN`.
4. Debe aparecer un único `COFRE DE 10 VUELTAS`.
5. Confirmar que el botón de cierre funciona antes y después de abrirlo.
6. Intentar tocar controles de carrera detrás del modal: no debe responder ninguno.
7. Abrir el cofre y pasar al informe/resultados.
