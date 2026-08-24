# Modo seguro — optimizaciones runtime (2026-08-24)

Objetivo: reducir presión de CPU, RAM y memoria gráfica en teléfonos iOS de bajos recursos sin alterar físicas, IA, geometría, cronometraje ni reglas de carrera.

## HUD y minimapa a 10 Hz

Se añade `src/game/scenes/RaceSafeModeRuntimeScene.js` sobre `RaceAdaptiveStartScene`.

Solo cuando `window.__tdrIosSafeMode === true`:
- la lógica completa de `update()` sigue ejecutándose a la frecuencia normal del juego;
- física, IA, controles, cronometraje y lógica de carrera NO se ralentizan;
- se evita actualizar textos del HUD, slider de progreso y posición visual del coche/sombra del minimapa entre refrescos;
- esos elementos se refrescan cada 100 ms (10 Hz).

En perfil normal no cambia nada.

## Liberación agresiva de assets de carrera

Al cerrar una carrera en modo seguro se retiran del TextureManager las texturas exclusivas de esa escena, después de que el cleanup del RaceScene base haya destruido sus GameObjects:
- `grass`
- `off`
- `asphalt`
- `asphaltOverlay`
- `banner-inferior`
- `start_base`, `start_l1..6` si existiesen
- skin runtime `car_<id>` del coche usado
- tiles del Beauty Layer de la pista activa, si existen

Al volver a entrar en carrera se recargan mediante los preload ya existentes. La contrapartida es un pequeño aumento del tiempo de carga a cambio de no acumular memoria entre escenas.

## Garaje

`GarageLazyCardsScene` mantiene el comportamiento anterior en dispositivos normales.

En modo seguro, al salir del garaje se eliminan las 16 texturas de cartas. Al volver a entrar se cargan de nuevo bajo demanda.

## Configuración / tutorial

`SettingsLazyTutorialScene` sigue cargando las cinco diapositivas del tutorial solo al abrirlo.

En modo seguro, al salir de Configuración se eliminan esas cinco texturas si llegaron a cargarse.

## Integración

`src/game/game.js` enruta ahora `RaceScene` a través de `RaceSafeModeRuntimeScene.js`.

No se ha reintroducido culling de pista. La superficie horneada / Beauty Layer sigue siendo la arquitectura de render vigente.
