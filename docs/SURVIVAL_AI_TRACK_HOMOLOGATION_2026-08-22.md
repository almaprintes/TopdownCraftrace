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

La repetición A/B con el mismo `TrackBuilder` y la misma entrada descubrió una discrepancia en la primera tabla: el arnés anterior introducía falsos picos en el cierre de varias geometrías F1. La tabla siguiente sustituye esa medición y compara el planificador anterior con el acondicionamiento nuevo sobre exactamente la misma cinta runtime. No se ha modificado ningún `track.json`.

| Circuito | Puntos runtime | Puntos plan | Pico antes | Pico después | Corrección ref. px | Margen mín. px | Estado |
|---|---:|---:|---:|---:|---:|---:|---|
| chicane-vale | 1628 | 1519 | 0.208 | 0.208 | 0 | 59.1 | BASE VÁLIDA |
| f1-baku | 1255 | 951 | 0.242 | 0.242 | 0 | 67.9 | BASE VÁLIDA |
| f1-imola | 1103 | 835 | 0.284 | 0.284 | 0 | 65.7 | BASE VÁLIDA |
| f1-jeddah | 1205 | 890 | 0.323 | 0.323 | 0 | 61.3 | BASE VÁLIDA |
| f1-melbourne | 1136 | 851 | 0.110 | 0.110 | 0 | 72.0 | BASE VÁLIDA |
| f1-miami | 1025 | 764 | 0.224 | 0.224 | 0 | 65.1 | BASE VÁLIDA |
| f1-monte-carlo | 1177 | 921 | 0.255 | 0.255 | 0 | 63.9 | BASE VÁLIDA |
| f1-sakhir | 1450 | 1072 | 0.731 | 0.424 | 1.47 | 60.0 | ACONDICIONADA |
| f1-shanghai | 1487 | 1101 | 0.755 | 0.476 | 2.88 | 59.9 | ACONDICIONADA |
| forest-endurance | 1657 | 1473 | 0.083 | 0.083 | 0 | 72.1 | BASE VÁLIDA |
| karting-canarias | 1640 | 1157 | 0.087 | 0.087 | 0 | 72.6 | BASE VÁLIDA |
| karting-tenerife | 1850 | 1465 | 0.247 | 0.247 | 0 | 46.9 | BASE VÁLIDA |
| offroad-raven-hollow | 1205 | 860 | 0.208 | 0.208 | 0 | 54.3 | BASE VÁLIDA |
| santa-cruz | 784 | 510 | 0.802 | 0.406 | 2.68 | 61.2 | ACONDICIONADA |
| switchback-park | 2102 | 2037 | 0.240 | 0.240 | 0 | 55.8 | BASE VÁLIDA |
| technical-ridge | 1204 | 1131 | 0.184 | 0.184 | 0 | 60.9 | BASE VÁLIDA |
| track01 | 414 | 347 | 0.246 | 0.246 | 0 | 58.9 | BASE VÁLIDA |

## Interpretación

`BASE VÁLIDA` significa:

- geometría procesable;
- trayectoria cerrada;
- valores finitos;
- offsets dentro del límite calculado;
- margen de seguridad positivo.

No significa todavía homologación visual final.

`ACONDICIONADA` indica que la referencia derivada contenía una concentración angular y se suavizó dentro de un límite proporcional a la anchura. Ese desplazamiento se descuenta del corredor lateral disponible, de modo que no consume el margen de seguridad sin contabilizarlo.

Revisión visual prioritaria:

- Sakhir;
- Shanghai;
- Santa Cruz.

Baku, Imola, Jeddah y Monte Carlo dejan de estar marcados: sus picos anteriores procedían del cierre inconsistente del arnés, no de la geometría runtime reproducida en la comparación A/B. Esta conclusión es estructural; aún falta homologación visual en juego.

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

## Observación de conducción provisional — Santa Cruz

Prueba visual comunicada el 22/08/2026:

- mejora previa en frecuencia de correcciones;
- persistía cabeceo tipo serpiente;
- algunos rivales ordenaban desplazamientos laterales grandes dentro de chicanes.

Causa comprobada en el controlador `legacy`:

- oscilación sinusoidal permanente añadida a `baseLane`;
- selección aleatoria periódica de un nuevo offset;
- protección de adelantamiento basada solo en la severidad de la curva actual.

Intento provisional y resultado:

- se probaron una línea personal estable, lectura anticipada de curva y límites laterales menores;
- el usuario confirmó que la conducción resultó peor;
- el cambio se revirtió completo en `883258c`;
- Santa Cruz continúa sin homologación visual;
- no se realizarán más retoques aislados del controlador `legacy` antes de completar el planificador y el controlador físico nuevos.

La próxima comparación deberá medir cambios de signo de dirección, velocidad lateral y posición real frente a rotación renderizada.

## Próximas acciones de Fase 1

1. Revisar visualmente Sakhir, Shanghai y Santa Cruz con el overlay DEV.
2. Confirmar visualmente que el acondicionamiento no recorta bordes ni deforma horquillas reales.
3. Confirmar que el offset optimizado reduce curvatura frente al centerline en secciones representativas.
4. Congelar la primera versión del modelo geométrico.
5. Pasar a Fase 2: perfil anticipativo de velocidad.
