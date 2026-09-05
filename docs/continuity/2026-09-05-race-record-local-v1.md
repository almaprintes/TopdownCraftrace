# Race Record v1 local — 2026-09-05

## Decisión de producto

La versión 1.0 NO activa cuentas, backend, leaderboards online ni recogida remota de datos de jugadores.

Todo lo descrito aquí se guarda exclusivamente en el dispositivo mediante el almacenamiento local ya usado por el juego. No se realiza ningún `fetch`, subida, sincronización ni envío de Race Record, evidencia, identificadores o ghosts.

La futura competición online queda aplazada a una versión 1.5/2.0 y exigirá revisar antes las declaraciones de privacidad de Google Play / App Store y la política de privacidad.

## RaceResult / Race Record v1

Cada sesión recibe un `raceId` UUID local. Cada vuelta completada crea un resultado inmutable con:

- `schemaVersion: 1`
- `recordVersion: 1`
- `resultId`
- `raceId`
- `trackKey`
- `carId`
- `lapMs`
- `lapIndex`
- `completedAt`
- `physicsVersion`
- `trackVersion`
- `carBalanceVersion`
- timing por reloj y por `simTick`
- evidencia local compacta
- estado de validación local

Se conservan hasta 100 Race Results recientes. Los récords/ghosts anteriores se migran de forma no destructiva.

## Evidencia local v1

La evidencia se muestrea aproximadamente cada 200 ms durante una vuelta. Las muestras crudas NO se conservan en RaceResult.

Al finalizar la vuelta solo se guarda:

- número de muestras y muestras inválidas;
- `fingerprint` determinista de la secuencia muestreada;
- primer/último `simTick`;
- `lapTick` y deriva estimada frente al reloj de vuelta;
- velocidad física máxima observada;
- velocidad máxima implícita entre muestras;
- mayor salto espacial;
- mayor salto de progreso de pista;
- bounding box aproximado de la vuelta;
- diagnósticos y flags de calidad.

La huella actual `fnv1a32` NO es una firma criptográfica ni demuestra autenticidad. Sirve para detectar cambios/corrupción y preparar la arquitectura futura. Una fase online deberá usar evidencia y validación de servidor más fuertes.

## Validación local

Estados actuales:

- `clean`: no se detectaron anomalías con las comprobaciones locales v1.
- `review`: existe alguna señal que merecería revisión futura.
- `legacy`: récord migrado sin evidencia moderna.
- `unverified`: resultado sin evidencia suficiente/compatible.

Flags v1 posibles:

- `NONFINITE_SAMPLE`
- `LOW_SAMPLE_COUNT`
- `TIMING_DRIFT`
- `POSITION_DISCONTINUITY`

`PROGRESS_DISCONTINUITY` se conserva como diagnóstico, no como invalidación, porque circuitos con zonas cercanas pueden producir ambigüedad en la proyección al centerline.

IMPORTANTE: ningún estado local es una certificación antitrampas. `authoritative` permanece `false` por diseño.

## Ghost / replay

No se crea un segundo sistema de ghost. El ghost existente se conserva y, cuando corresponde al Personal Best, se enriquece con:

- `raceId`
- `resultId`
- `raceResultSchemaVersion`
- `raceRecordVersion`
- `localValidationStatus`
- `evidenceFingerprint`

## Frontera de privacidad

Para la 1.0:

- no hay cuenta online;
- no hay email/nombre real;
- no hay país/región;
- no hay GPS;
- no hay device ID competitivo;
- no hay telemetría remota;
- no hay subida de ghost/replay;
- no hay backend de resultados.

Antes de cruzar esta frontera en una futura versión se deberá actualizar la documentación legal y las declaraciones de las tiendas.
