# Validación estructural del bot físico — Fase 3 — 22/08/2026

## Alcance

Primer controlador físico experimental de Supervivencia:

- un solo rival;
- cuerpo Arcade real;
- dirección, gas y freno continuos;
- objetivo anticipado sobre la trazada de Fase 1;
- velocidad objetivo tomada del perfil de Fase 2;
- sin teletransporte durante la marcha;
- sin tráfico, adelantamientos ni colisión con el pelotón;
- activación voluntaria mediante `tdr2:survivalAiMode = planner_v1`;
- el modo predeterminado continúa siendo `legacy`.

Archivos:

- `src/game/ai/survivalPhysicalBotController.js`;
- integración en `RaceSurvivalModeScene.js` y `RaceSurvivalTrafficScene.js`.

## Simulación determinista

Se integraron 60 segundos a 60 Hz por circuito con el mismo controlador y parámetros base. La simulación no sustituye una prueba dentro de Phaser, pero detecta pérdidas de trazada y divergencias antes de publicar el control general.

| Circuito | Vueltas/60 s | Dist. media línea | Dist. máxima | Semiancho nominal | Estado |
|---|---:|---:|---:|---:|---|
| chicane-vale | 1.06 | 21.8 | 63.2 | 77 | BASE VÁLIDA |
| f1-baku | 1.57 | 21.9 | 47.7 | 79 | BASE VÁLIDA |
| f1-imola | 1.86 | 18 | 50.9 | 79 | BASE VÁLIDA |
| f1-jeddah | 1.6 | 25.5 | 95.6 | 80 | FUERA DE CORREDOR |
| f1-melbourne | 1.75 | 23.3 | 53.1 | 80 | BASE VÁLIDA |
| f1-miami | 1.95 | 24.3 | 53.7 | 80 | BASE VÁLIDA |
| f1-monte-carlo | 1.67 | 22.4 | 56.1 | 76 | BASE VÁLIDA |
| f1-sakhir | 1.32 | 16.4 | 52.4 | 80 | BASE VÁLIDA |
| f1-shanghai | 1.24 | 23.4 | 79.4 | 80 | BASE VÁLIDA |
| forest-endurance | 1.08 | 20.3 | 59.7 | 81 | BASE VÁLIDA |
| karting-canarias | 1.25 | 22.8 | 69.3 | 85 | BASE VÁLIDA |
| karting-tenerife | 1.01 | 29.7 | 70.6 | 66.6 | FUERA DE CORREDOR |
| offroad-raven-hollow | 1.77 | 23.1 | 53.2 | 75 | BASE VÁLIDA |
| santa-cruz | 2.35 | 23.8 | 61.3 | 78 | BASE VÁLIDA |
| switchback-park | 0.83 | 19.9 | 57.8 | 74 | BASE VÁLIDA |
| technical-ridge | 1.32 | 31.2 | 69.9 | 76 | BASE VÁLIDA |
| track01 | 3.39 | 31.7 | 60.3 | 81 | BASE VÁLIDA |

Resultado:

- 17/17 avanzan y completan recorrido;
- 15/17 permanecen dentro del semiancho nominal en esta simulación;
- Jeddah alcanza 95.6 px frente a 80 px;
- Karting Tenerife alcanza 70.6 px frente a 66.6 px;
- Santa Cruz completa aproximadamente 2.35 vueltas/60 s, con distancia media 23.8 px y máxima 61.3 px frente a 78 px de semiancho.

## Estado de homologación

Fase 3 parcial, no terminada.

Antes de migrar más bots:

1. probar el bot único dentro de Phaser;
2. verificar que el cuerpo Arcade no sale de bordes reales;
3. corregir Jeddah y Karting Tenerife;
4. medir oscilaciones de dirección, distancia a línea, gas/freno y tiempo de vuelta;
5. añadir recuperación segura si el bot pierde la pista;
6. calibrar los parámetros con el coche patrón;
7. mantener los otros cuatro rivales en `legacy`;
8. no activar `planner_v1` como valor predeterminado.

## Activación DEV

```js
localStorage.setItem('tdr2:survivalAiMode', 'planner_v1');
localStorage.setItem('tdr2:survivalAiDebug', '1');
location.reload();
```

Volver al comportamiento publicado:

```js
localStorage.setItem('tdr2:survivalAiMode', 'legacy');
location.reload();
```

La telemetría permanece disponible en `window.__TDR_SURVIVAL_AI__`, incluyendo `steer`, `throttle`, `brake`, `targetSpeed` y `distanceToLine`.
