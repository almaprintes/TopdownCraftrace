# Arquitectura de carrera — experiencia limpia

## Objetivo

La carrera no debe crecer mediante una cadena indefinida de `RaceSomethingFixScene`.
Las correcciones y funciones nuevas se implementan por responsabilidad y composición.

## Autoridades

### 1. Física y vehículo

La frontera física actual termina en `RaceHandbrakeFrontAxleFixScene.js` mientras se completa la segunda fase de refactorización.
No debe contener presentación de recompensas ni nuevas ventanas DOM.

### 2. Experiencia de sesión

`RaceExperienceScene.js` es la única escena superior cargada por `game.js` para la experiencia shipping.
Coordina pausa, finalización y presentación de sesión sin sintetizar vueltas ni alterar la física.

### 3. UI DOM

La interfaz de sesión vive en módulos de `src/game/ui/`.
Actualmente:

- `raceSessionUi.js`: comportamiento/montaje.
- `raceSessionUi.css`: presentación.

La escena no debe volver a contener grandes bloques de HTML/CSS embebidos.

### 4. Cronometraje y economía

Una vuelta tiene una sola fuente de verdad. No se permiten bridges que inserten filas sintéticas en `ttHistory` desde una segunda capa.
La economía puede validar entregas faltantes, pero nunca crear una segunda vuelta para conseguirlo.

## Reglas de mantenimiento

1. No añadir una escena heredada para corregir un único bug visual o de navegación.
2. Preferir funciones/módulos/composición para UI, telemetría y servicios.
3. `game.js` debe cargar `RaceExperienceScene.js` directamente.
4. Los modales y paneles de jugador nuevos deben preferir DOM cuando no necesiten renderizado de mundo Phaser.
5. Las recompensas de sesión usan los assets canónicos del Pase de Temporada (`free_blue`, `free_green`, `free_purple`, `free_gold`).
6. No reintroducir `RaceLapHistoryBridgeScene` ni otra escritura sintética de historial sin una prueba reproducible y una revisión explícita de arquitectura.
7. Antes de crear un nuevo `*FixScene.js`, comprobar si la corrección pertenece al propietario funcional existente.

## Siguiente fase

Reducir la cadena física inferior agrupando responsabilidades estables (controles/superficies, VFX, telemetría y modos) sin cambiar la física homologada durante la migración.
