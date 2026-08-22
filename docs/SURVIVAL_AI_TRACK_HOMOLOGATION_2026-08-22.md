# Homologación geométrica de IA por circuito — 22/08/2026

## Alcance

Validación estructural de la Fase 1 definida en `docs/SURVIVAL_AI_ROADMAP_2026-08-22.md`.

El mismo analizador reutilizable se aplica a todos los circuitos. No se mantienen trazadas manuales independientes. Cada circuito aporta su centerline, anchura y geometría runtime; el planificador deriva una trayectoria limitada por su espacio útil.

Módulo:

- `src/game/ai/trackRacingLinePlanner.js`

Integración de observación:

- `src/game/scenes/RaceSurvivalTrafficScene.js`

La línea del planificador se muestra en amarillo con el overlay DEV. Todavía no controla los coches.

## Resultado sobre la lista actual

Los 17 circuitos producen un modelo finito y una trayectoria limitada por la anchura disponible.

| Circuito | Puntos runtime | Puntos plan | Offset máx. px | Margen mín. px | Pico curvatura | Estado |
|---|---:|---:|---:|---:|---:|---|
| chicane-vale | 1628 | 1519 | 16.6 | 59.1 | 0.208 | BASE VÁLIDA |
| f1-baku | 1250 | 949 | 9.9 | 69.1 | 2.006 | REVISAR PICO |
| f1-imola | 1098 | 833 | 8.5 | 70.5 | 2.286 | REVISAR PICO |
| f1-jeddah | 1198 | 888 | 18.8 | 61.2 | 2.429 | REVISAR PICO |
| f1-melbourne | 1136 | 850 | 8.5 | 71.5 | 0.7 | BASE VÁLIDA |
| f1-miami | 1023 | 763 | 15.8 | 64.2 | 0.535 | BASE VÁLIDA |
| f1-monte-carlo | 1170 | 919 | 11.5 | 64.5 | 2.089 | REVISAR PICO |
| f1-sakhir | 1449 | 1070 | 18.2 | 61.8 | 1.353 | REVISAR PICO |
| f1-shanghai | 1488 | 1099 | 17.2 | 62.8 | 2.061 | REVISAR PICO |
| forest-endurance | 1657 | 1473 | 10.3 | 72.1 | 0.1 | BASE VÁLIDA |
| karting-canarias | 1640 | 1157 | 12.4 | 72.6 | 0.181 | BASE VÁLIDA |
| karting-tenerife | 1850 | 1465 | 16 | 46.9 | 0.247 | BASE VÁLIDA |
| offroad-raven-hollow | 1205 | 860 | 15.2 | 54.3 | 0.213 | BASE VÁLIDA |
| santa-cruz | 785 | 510 | 16.8 | 61.2 | 0.808 | REVISAR PICO |
| switchback-park | 2102 | 2037 | 16.2 | 55.8 | 0.24 | BASE VÁLIDA |
| technical-ridge | 1204 | 1131 | 15.5 | 60.9 | 0.184 | BASE VÁLIDA |
| track01 | 414 | 347 | 21.3 | 58.9 | 0.246 | BASE VÁLIDA |

## Interpretación

`BASE VÁLIDA` significa:

- geometría procesable;
- trayectoria cerrada;
- valores finitos;
- offsets dentro del límite calculado;
- margen de seguridad positivo.

No significa todavía homologación visual final.

`REVISAR PICO` identifica una discontinuidad angular o una curva extremadamente concentrada que exige inspección con overlay antes de usar la trayectoria para controlar coches.

Revisión visual prioritaria:

- Baku;
- Imola;
- Jeddah;
- Monte Carlo;
- Sakhir;
- Shanghai;
- Santa Cruz.

Los circuitos con centerline fuente poco denso pueden producir picos aunque la cinta renderizada sea visualmente aceptable. Antes de corregir el JSON debe comprobarse la geometría runtime generada por `TrackBuilder`.

## Procedimiento obligatorio para cada circuito nuevo

1. Añadir el circuito mediante el flujo normal de `trackRegistry`.
2. Confirmar:
   - circuito cerrado;
   - sentido correcto;
   - centerline sin cruces accidentales;
   - anchura general y anchuras locales;
   - meta y checkpoints;
   - superficie.
3. Ejecutar el analizador de trazada.
4. Rechazar la homologación si:
   - `valid === false`;
   - existe un valor no finito;
   - el margen mínimo es menor que el margen de seguridad;
   - la trayectoria atraviesa visualmente un borde;
   - aparecen picos de curvatura que no corresponden a una horquilla real.
5. Activar el overlay DEV:
   `localStorage.setItem('tdr2:survivalAiDebug', '1')`.
6. Inspeccionar como mínimo:
   - horquilla;
   - chicane;
   - curva rápida;
   - curva larga;
   - recta principal;
   - cierre de vuelta.
7. Registrar el circuito en la tabla de homologación.
8. No activar `planner_v1` para ese circuito hasta superar la revisión visual y posteriormente el perfil de velocidad.

## Datos que deben conservarse

No debe crearse un archivo manual de trazada por circuito salvo excepción justificada. La fuente sigue siendo la geometría oficial del circuito.

Si un circuito necesita una excepción, debe documentarse:

- motivo;
- zona afectada;
- dato geométrico incorrecto o limitación del optimizador;
- solución aplicada;
- captura/telemetría de validación;
- commit.

## Próximas acciones de Fase 1

1. Revisar visualmente los siete circuitos marcados.
2. Añadir detección explícita de discontinuidades/cúspides.
3. Confirmar que el offset optimizado reduce curvatura frente al centerline.
4. Congelar la primera versión del modelo geométrico.
5. Pasar a Fase 2: perfil anticipativo de velocidad.
