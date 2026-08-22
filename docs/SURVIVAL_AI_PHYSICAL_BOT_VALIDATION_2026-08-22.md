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

Calibración aplicada:

- lookahead dependiente de velocidad reducido a 25–82 px;
- envolvente inicial de velocidad: 82 % del máximo del coche patrón;
- reducción progresiva de velocidad cuando aumenta el error angular;
- reducción progresiva de velocidad cuando aumenta la distancia a la trazada;
- ninguna excepción ni parámetro específico por circuito.

| Circuito | Vueltas/60 s | Dist. media línea | Dist. máxima | Semiancho nominal | Estado |
|---|---:|---:|---:|---:|---|
| chicane-vale | 0.96 | 15.5 | 41.7 | 77 | BASE VÁLIDA |
| f1-baku | 1.41 | 15.5 | 35 | 79 | BASE VÁLIDA |
| f1-imola | 1.69 | 13.1 | 35.4 | 79 | BASE VÁLIDA |
| f1-jeddah | 1.42 | 16 | 40.1 | 80 | BASE VÁLIDA |
| f1-melbourne | 1.59 | 15.8 | 36.3 | 80 | BASE VÁLIDA |
| f1-miami | 1.76 | 16.9 | 37.9 | 80 | BASE VÁLIDA |
| f1-monte-carlo | 1.5 | 16 | 36.9 | 76 | BASE VÁLIDA |
| f1-sakhir | 1.2 | 12.2 | 30.5 | 80 | BASE VÁLIDA |
| f1-shanghai | 1.1 | 15.7 | 44.9 | 80 | BASE VÁLIDA |
| forest-endurance | 0.98 | 14.1 | 33.3 | 81 | BASE VÁLIDA |
| karting-canarias | 1.11 | 16.8 | 42 | 85 | BASE VÁLIDA |
| karting-tenerife | 0.89 | 18.7 | 43.1 | 66.6 | BASE VÁLIDA |
| offroad-raven-hollow | 1.58 | 15.8 | 33 | 75 | BASE VÁLIDA |
| santa-cruz | 1.99 | 17.6 | 42.3 | 78 | BASE VÁLIDA |
| switchback-park | 0.75 | 14.9 | 36.5 | 74 | BASE VÁLIDA |
| technical-ridge | 1.17 | 19.9 | 50.4 | 76 | BASE VÁLIDA |
| track01 | 3.04 | 20.6 | 38.1 | 81 | BASE VÁLIDA |

Resultado:

- 17/17 avanzan y completan recorrido;
- 17/17 permanecen dentro del semiancho nominal en esta simulación;
- Jeddah mejora de 95.6 a 40.1 px de desviación máxima;
- Karting Tenerife mejora de 70.6 a 43.1 px;
- Santa Cruz mejora de 61.3 a 42.3 px, con distancia media de 17.6 px;
- el precio de la estabilidad es una reducción provisional de ritmo, pendiente de calibración contra telemetría real.

## Estado de homologación

Fase 3 estructuralmente válida en simulación, pero no homologada todavía dentro de Phaser.

Antes de migrar más bots:

1. probar el bot único dentro de Phaser;
2. verificar que el cuerpo Arcade no sale de bordes reales;
3. confirmar dentro del juego las mejoras simuladas en Jeddah y Karting Tenerife;
4. medir oscilaciones de dirección, distancia a línea, gas/freno y tiempo de vuelta;
5. añadir recuperación segura si el bot pierde la pista;
6. calibrar los parámetros con el coche patrón;
7. mantener los otros cuatro rivales en `legacy`;
8. no activar `planner_v1` como valor predeterminado.

## Activación DEV

Enlace de sesión, sin modificar la preferencia guardada:

```text
https://topdown-craftrace.vercel.app/?survivalAi=planner_v1&survivalAiDebug=1
```

Activación persistente desde consola:

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

La telemetría permanece disponible en `window.__TDR_SURVIVAL_AI__`, incluyendo `steer`, `throttle`, `brake`, `targetSpeed`, `distanceToLine`, `offTrackSeconds` y `recoveryCount`.

## Watchdog de prueba

Solo para el bot experimental:

- acumula tiempo fuera de pista mediante la consulta runtime `_isOnTrack`;
- detecta bloqueo prolongado por debajo de 6 px/s;
- tras 1.25 s fuera de pista o 3 s bloqueado registra `physical_bot_recovery`;
- recupera el cuerpo sobre la muestra válida más cercana;
- no oculta el fallo: motivo, muestra y contador quedan en telemetría;
- no afecta al jugador ni a los bots `legacy`.

La recuperación es una red de seguridad para QA, no una mecánica de conducción ni un criterio de homologación.
