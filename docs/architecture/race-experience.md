# Arquitectura de carrera — experiencia limpia

## Objetivo

La carrera no debe crecer mediante una cadena indefinida de `RaceSomethingFixScene`.
Las correcciones y funciones nuevas se implementan por responsabilidad y composición.

## Autoridades

### 1. Física y vehículo

`RaceHandbrakePhysicsScene.js` es la frontera superior de física específica del freno de mano.
Su responsabilidad es exclusivamente el comportamiento físico afinado sobre la cadena inferior existente.
No contiene DOM, pausa, HUD ni economía.

### 2. Experiencia de sesión

`RaceExperienceScene.js` es la única escena superior cargada por `game.js` para la experiencia shipping.
Coordina pausa, finalización, integridad de entrega y presentación de sesión sin sintetizar vueltas ni modificar la física.

### 3. UI DOM

La interfaz de carrera vive en módulos de `src/game/ui/`:

- `racePauseUi.js` + `racePauseUi.css`: menú de pausa.
- `raceSessionUi.js` + `raceSessionUi.css`: recompensas y cierre de tanda.
- `raceInstrumentHud.js` + `raceInstrumentHud.css`: instrumentos, vuelta, sectores, tiempos y velocidad.
- `raceUiVisibility.js`: ocultar/restaurar HUD y controles cuando una capa modal lo requiere.

`RaceTelemetryHudScene.js` coordina el HUD, pero no contiene su HTML ni CSS.
Las escenas no deben volver a contener grandes bloques de presentación embebidos.

### 4. Feedback de conducción

`RaceKerbFeedbackScene.js` detecta la interacción con pianos y decide cuándo emitir feedback.
Las implementaciones concretas viven en `src/game/services/raceFeedback.js`:

- háptica nativa/`navigator.vibrate`;
- shake de cámara;
- resistencia física ligera del piano.

La detección de superficie no debe conocer APIs de plataforma ni detalles de presentación.

### 5. Cronometraje y economía

Una vuelta tiene una sola fuente de verdad. No se permiten bridges que inserten filas sintéticas en `ttHistory` desde una segunda capa.
La integridad de recompensas puede comprobar que una vuelta válida ya registrada recibió su entrega, pero nunca crear una segunda vuelta para conseguirlo.

## Reglas de mantenimiento

1. No añadir una escena heredada para corregir un único bug visual o de navegación.
2. Preferir funciones/módulos/composición para UI, telemetría, feedback y servicios.
3. `game.js` debe cargar `RaceExperienceScene.js` directamente.
4. Los modales y paneles de jugador nuevos deben preferir DOM cuando no necesiten renderizado de mundo Phaser.
5. Las recompensas de sesión usan los assets canónicos del Pase de Temporada (`free_blue`, `free_green`, `free_purple`, `free_gold`).
6. No reintroducir `RaceLapHistoryBridgeScene` ni otra escritura sintética de historial sin una prueba reproducible y una revisión explícita de arquitectura.
7. La física no importa módulos de UI ni economía.
8. La UI no debe vivir dentro de `*ProfilerScene`, `*FixScene` o wrappers temporales.
9. Antes de crear un nuevo `*FixScene.js`, comprobar si la corrección pertenece a una autoridad funcional existente.

## Siguiente fase

Reducir la cadena inferior agrupando responsabilidades estables de controles/superficies y modos, manteniendo congelada la física homologada durante la migración.
