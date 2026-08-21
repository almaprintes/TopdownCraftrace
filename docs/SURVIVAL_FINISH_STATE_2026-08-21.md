# Supervivencia — estado FINISHED por corredor

Fecha: 2026-08-21

## Problema detectado

Con coches muy evolucionados, especialmente configuraciones Prototype, el jugador puede doblar varias veces a los rivales en Supervivencia. Como la lógica de eliminación depende de los pasos por meta del grupo, el jugador podía terminar registrando 7, 8 o 9 vueltas antes de que se resolvieran las cinco eliminaciones.

Esto generaba dos problemas:

1. El jugador obtenía vueltas y potencial de botín por encima de la distancia económica prevista para Supervivencia.
2. Cortar toda la carrera al completar el líder cinco vueltas sería incorrecto: algunos rivales todavía tendrían rondas/eliminaciones pendientes y, en un futuro multijugador, los demás jugadores deben poder completar su propia distancia.

## Regla adoptada

La distancia pertenece a cada corredor, no al líder.

Cada participante dispone de tres estados conceptuales:

- `RACING`: sigue compitiendo y puede completar vueltas.
- `FINISHED`: ha completado sus cinco vueltas válidas; conserva su posición/clasificación, pero no puede sumar una sexta vuelta.
- `ELIMINATED`: ha quedado fuera por la regla de Supervivencia.

El máximo por participante es **5 vueltas válidas**.

## Comportamiento del jugador

Cuando el jugador completa su quinta vuelta:

- `completedLaps` queda fijado en 5;
- pasa a estado `FINISHED`;
- su posición física queda bloqueada en el punto de finalización y su velocidad se anula;
- no puede recorrer una sexta vuelta;
- permanece dentro de la clasificación mientras el resto de participantes resuelve sus vueltas y eliminaciones pendientes;
- el HUD indica que el jugador ha finalizado y está esperando a la parrilla.

La pantalla final de Supervivencia no se abre simplemente porque el jugador haya llegado a cinco vueltas. Se abre cuando el sistema de eliminaciones queda resuelto como corresponde.

## Comportamiento de los rivales

Un rival que alcance cinco vueltas también queda en `FINISHED` y su progreso se congela en cinco vueltas. Sigue contando como participante que ya ha cruzado los umbrales de vuelta anteriores, de forma que la lógica de eliminación puede cerrar correctamente las rondas pendientes.

## Compatibilidad con la eliminación

La regla histórica se conserva:

- en cada ronda se elimina al último participante que todavía no haya alcanzado el umbral de vuelta correspondiente;
- un participante `FINISHED` cuenta como que ya ha alcanzado cualquier umbral de las vueltas 1 a 5;
- por tanto, un líder que haya doblado varias veces a otros coches no impide que las eliminaciones restantes se resuelvan;
- la carrera global termina cuando queda determinado el superviviente final, no cuando el líder alcanza cinco vueltas.

## Preparación para multijugador

Esta arquitectura es deliberadamente compatible con un futuro modo multijugador.

El ganador puede completar primero la distancia establecida y quedar `FINISHED`, mientras los demás jugadores continúan hasta completar sus propias vueltas o quedar eliminados según las reglas del modo. No se fuerza el cierre de la carrera de todos cuando termina el líder.

## Protección económica

Supervivencia mantiene su unidad económica de diseño en cinco vueltas por participante. El jugador no puede convertir una gran ventaja de rendimiento en vueltas extra recompensables.

Esto protege la calibración de progresión ya documentada:

- 5 Street: ~11–12 min.
- 5 Sport: ~3,10 h acumuladas.
- 5 Racing: ~15,53 h acumuladas.
- 5 Prototype: ~51,13 h activas para el perfil optimizador bajo las hipótesis de balance vigentes.

La normalización temporal de botín y los créditos persistentes entre sesiones siguen funcionando de forma independiente.

## Implementación

Archivo nuevo:

- `src/game/scenes/RaceSurvivalFinishStateScene.js`

Integración en la cadena de escenas:

- `src/game/scenes/RaceReplayBrakeExactScene.js` importa ahora `RaceSurvivalFinishStateScene.js`, que a su vez conserva la capa `RaceSessionLapCapScene.js`.

Constante:

- `SURVIVAL_MAX_LAPS = 5`

## Casos de prueba recomendados

1. Coche Prototype muy superior: doblar dos o más veces a varios rivales y comprobar que el jugador queda fijado en 5 vueltas.
2. Confirmar que los rivales continúan resolviendo las rondas pendientes después de que el jugador termine.
3. Verificar que la quinta eliminación todavía determina correctamente victoria/derrota.
4. Confirmar que ningún rival supera cinco vueltas visuales o lógicas.
5. Confirmar que el informe de sesión del jugador no incluye vueltas 6+.
6. Repetir en un circuito corto y uno largo para comprobar que no reaparece ninguna ventaja económica por longitud de vuelta.

## Commits

- `9da504a9` — nueva capa de estado FINISHED por corredor.
- `05cc91f0` — integración de la nueva capa en la cadena de RaceScene.
