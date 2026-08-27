# Continuidad 2026-08-27 — Sistema de maestría de coches

## Estado y problema detectado
El primer desbloqueo real de maestría se produjo con HÉLIX Spark. La prueba física reveló que la mecánica existía, pero la experiencia estaba incompleta e incoherente:

- En Lobby aparecía una rueda sobre el coche, mal posicionada y con una lectura visual distinta a la de carrera.
- Estadísticas mostraba otra versión pequeña y aislada de la rueda y apenas indicaba `1/9`.
- En Carrera la insignia tenía la lectura correcta de cinco radios y una buena posición sobre el coche.
- No existía un control visible para ocultar la insignia.
- Al cruzar el primer umbral no había celebración ni explicación, por lo que el jugador no tenía forma de saber qué significaba la rueda que acababa de aparecer.

## Historia real de las nueve insignias
El commit original `1ba6608ed3794c7e11af2dfb92648685b3198487` implementó una progresión de nueve insignias, pero no añadió nueve imágenes independientes. La progresión se generó por código.

La tabla canónica es:

| Nivel | Distancia | Material | Radios |
|---|---:|---|---:|
| 1 | 25 km | Bronce | 5 |
| 2 | 100 km | Bronce | 8 |
| 3 | 250 km | Bronce | 12 |
| 4 | 500 km | Plata | 5 |
| 5 | 750 km | Plata | 8 |
| 6 | 1.000 km | Plata | 12 |
| 7 | 1.500 km | Oro | 5 |
| 8 | 2.000 km | Oro | 8 |
| 9 | 3.000 km | Oro | 12 |

El fallo de consistencia provenía de tener dos renderers distintos: Lobby/Estadísticas generaban SVG y Carrera dibujaba la rueda mediante Phaser Graphics.

## Decisión de arquitectura
`src/game/stats/carMastery.js` pasa a ser la única fuente canónica para:

- umbrales;
- material;
- número de radios;
- colores;
- geometría de la insignia;
- progreso hacia el siguiente nivel;
- preferencia de visualización;
- reconocimiento de desbloqueos ya explicados al jugador.

Carrera sigue dibujando con Phaser Graphics por rendimiento y porque la insignia forma parte del rig del coche, pero consume exactamente el mismo `masteryVisualSpec()` que SVG. Ya no existen tablas locales duplicadas de materiales o radios.

## Celebración y onboarding
Se incorpora `src/game/ui/MasteryUnlockModal.js`.

Cuando el jugador cruza un umbral durante una carrera:

1. se detecta el nivel anterior y posterior al guardar distancia;
2. si aumenta la maestría, aparece una celebración;
3. se muestra la insignia grande, material y nivel;
4. en el nivel 1 se explica explícitamente qué es la maestría y por qué ha aparecido esa insignia;
5. se informa de que la insignia se muestra sobre el coche por defecto y puede ocultarse en Configuración sin perder progreso;
6. al continuar, el desbloqueo queda marcado como explicado.

Para jugadores que ya habían cruzado un umbral antes de existir este onboarding, el Lobby detecta una maestría no reconocida y muestra la explicación retroactivamente una sola vez. Esto permite recuperar correctamente el primer desbloqueo ya conseguido con HÉLIX Spark.

## Visualización sobre el coche
La opción es global y por defecto está activada.

Configuración > Vídeo incorpora:

`INSIGNIA DE MAESTRÍA — ON/OFF`

Texto: `Muestra la insignia de maestría sobre el techo del coche. Ocultarla nunca borra tu progreso.`

La preferencia se guarda en `tdr2:settings.video.showMasteryBadge`.

Afecta a la visualización física sobre el coche en Lobby y Carrera. Estadísticas sigue mostrando la insignia porque allí es información de progresión, no decoración del coche.

## Lobby
La insignia deja de posicionarse mediante porcentajes fijos de viewport. Se calcula a partir del `getBoundingClientRect()` real de la imagen del coche y se ancla al centro del techo. El tamaño también se deriva del ancho visual del coche y queda acotado a un rango seguro.

Esto elimina el desplazamiento observado en dispositivos con relaciones de aspecto diferentes.

## Estadísticas
La ruta de Estadísticas carga ahora `StatsMasteryScene.js`, una capa sobre la escena existente que mantiene las estadísticas anteriores y añade contexto de maestría.

En la lista de coches, la insignia deja de ser un icono solitario en una esquina y se presenta como un pequeño bloque `MAESTRÍA / NIVEL N`.

En el detalle de coche aparece un panel específico de maestría con:

- insignia actual;
- material y número de radios;
- nivel N/9;
- explicación de la mecánica;
- barra de progreso;
- kilómetros actuales frente al siguiente umbral;
- estado de maestría máxima en nivel 9.

## Archivos principales
- `src/game/stats/carMastery.js`
- `src/game/ui/MasteryUnlockModal.js`
- `src/game/ui/LobbyPublishPolish.js`
- `src/game/ui/lobby-publish-polish.css`
- `src/game/scenes/RaceMileageStatsScene.js`
- `src/game/scenes/RaceMasteryRoofScene.js`
- `src/game/scenes/SettingsGraphicsQualityScene.js`
- `src/game/scenes/StatsMasteryScene.js`
- `src/game/game.js`

## Principio de producto
Una maestría no debe aparecer como un adorno misterioso. Es una señal pública de experiencia con un coche. Por tanto cada desbloqueo debe cumplir tres cosas: sentirse ganado, explicarse por sí mismo y dar al jugador control sobre si quiere exhibirlo.
