# Top Down RACE — autoridad de carrera de Supervivencia — 2026-08-30

## Punto de partida verificado

`main` estaba en `1ecad87eb76d9a97878068cc4db38d72b44772e4` (`Stretch survival grid to two-car gaps`).

Se revisaron `docs/CHATS.md`, `docs/continuity/2026-08-30-mobile-stabilization-night.md`, `RaceSurvivalCompetitionScene.js`, `RaceSurvivalModeScene.js`, el smoke de Supervivencia y los módulos de roster/grid.

La reconstrucción limpia de parrilla ya estaba activa, pero clasificación, vueltas y eliminación seguían heredando la autoridad legacy de `RaceSurvivalModeScene`. La ronda se cerraba cuando todos menos uno habían disparado el cruce de meta y se eliminaba directamente al único pendiente. Por tanto, un trigger perdido o tardío podía decidir la eliminación aunque el progreso real dijera otra cosa.

## Nueva autoridad

Se añade `src/game/modes/survival/survivalRaceState.js` como módulo puro y testeable. Es la fuente de verdad para participantes activos, progreso y clasificación, armado de meta, crédito de una única vuelta por ronda, rechazo de dobles cruces, ronda actual y máximo de 5, selección del eliminado, fin por eliminación del jugador y ganador.

La geometría de meta sigue detectándose en la Scene porque depende de sprites/cuerpos y centerline, pero el detector ya no decide clasificación ni víctima.

## Regla de eliminación

El cruce de meta solo abre/cierra la ventana lógica de la ronda. Cuando existe crédito suficiente para cerrar la vuelta, el eliminado se toma del último puesto de la clasificación por `raceDistance` autoritativa.

Eso desacopla `¿hay suficientes cruces válidos para cerrar esta vuelta?` de `¿quién es realmente el último en carrera?`. El segundo se resuelve exclusivamente por progreso. Si una CPU o el jugador pierde un trigger pero físicamente va por delante, no se elimina por ese fallo de trigger.

## Antidoble conteo

Cada participante solo puede acreditar `round + 1`. Otro paso por meta mientras esa misma ronda continúa devuelve `already-credited` y no suma otra vuelta. El primer paso por meta únicamente arma el sistema, conservando el comportamiento necesario para una parrilla situada detrás de la línea de salida/meta.

La distancia recorrida desde el último paso sigue actuando como guardia contra rebotes/dobles intersecciones de la misma pasada.

## Progreso del jugador

La clasificación ya no depende de `completedLaps + frac` para conocer la posición física del jugador. `RaceSurvivalCompetitionScene` mantiene un progreso continuo desenrollando la fracción de centerline, igual que las CPU ya disponen de `absProgress`.

Así el ranking puede seguir siendo correcto incluso si el crédito de meta de una vuelta falla.

## Consumo compartido

`RaceSurvivalCompetitionScene` expone y refresca `_survivalRaceSnapshot`, generado por la misma autoridad. De ahí se derivan clasificación activa, posición del jugador, número de coches, vuelta objetivo, cruces acreditados, eliminado y ganador.

Los flags `bot.active` y visibilidad de CPU se sincronizan con el evento de eliminación de esa misma autoridad, de modo que cualquier consumidor de las CPU, incluido minimapa si las representa, recibe el mismo estado activo/inactivo.

## Tests automáticos

`scripts/survival-smoke.mjs` amplía cobertura para comprobar seis coches únicos, orden lento -> rápido y dificultad progresiva, techo +3 %, parrilla sobre centerline, primer cruce como armado, rechazo de doble crédito, eliminación por progreso aunque el trigger pendiente pertenezca a otro coche, exactamente una eliminación por vueltas 1 a 5, un ganador tras vuelta 5 y fin inmediato correcto si el jugador es el último real.

`npm run build` ya ejecuta `check:survival` desde `prebuild`, por lo que estas invariantes forman parte del CI existente.

## Física

No se toca BASE 1.0, parámetros homologados, `resolveCarParams`, tuning ni interacción de superficies. Esta tanda es exclusivamente estado de competición/clasificación/meta/eliminación y su integración UI.

## Validación física recomendada

En iPhone y Android comprobar 6 coches y parrilla larga; 6 -> 5 -> 4 -> 3 -> 2 -> 1 con exactamente una eliminación por vuelta; eliminación correcta del jugador si va último; campeón y resultados al ganar en vuelta 5; HUD sin contradicciones; minimapa coherente con las eliminaciones; y reinicio limpio al repetir una partida.
