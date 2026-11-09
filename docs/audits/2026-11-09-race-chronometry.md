# Top Down RACE: CraftRace · auditoría del cronómetro (09/11/2026)

**Alcance:** inspección del código de la rama `main` de 09/11/2026 y prueba reproducible de pausas. **No constituye validación física en iPhone ni Android, ni certificación de marcas oficiales.** Esta rama solo añade documentación y una prueba, sin modificar la física, récords, anuncios, Supabase ni versión pública.

## Hallazgos comprobables

1. **Reloj principal monotónico:** `src/game/scenes/RaceScene.js` utiliza `performance.now()` para inicio (`timing.lapStart`), sectores (s1/s2), meta (`lapTime = now - timing.lapStart`) y HUD. Correcto frente a cambios del reloj del sistema.
2. **El instante de meta se toma al detectar el cruce en el update:** el segmento `prevCarX/Y → car.x/y` y `crossesDirectedFinishGate` determinan si hubo cruce, pero `lapTime` captura `performance.now()` al ejecutar el callback. La marca puede diferir del instante interpolado entre dos posiciones. **Riesgo pendiente de medir/corregir:** sesgo dependiente del intervalo entre frames, que puede afectar a clasificaciones y fantasmas.
3. **Simulación y reloj no comparten escala:** `dt = Math.min(0.05, deltaMs / 1000)`, `_simAccMs` limitado a 250 ms, y ticks de simulación aproximados de 60 Hz; mientras tanto, el cronómetro corre por tiempo real. Un bloqueo de FPS puede producir una trayectoria simulada más lenta que el reloj. No es un bug del reloj en sí, pero importa para comparabilidad.
4. **Pausas:** `src/game/ui/racePauseTiming.js` excluye el tiempo detenido desplazando en conjunto `timing.lapStart`, `_tdrSessionLapClockStart` y `_ghostLapStartPerf`. Tiene protección ante doble reanudación y prueba ya existente `scripts/race-pause-timing-smoke.mjs`. La implementación previa `RacePauseMenuScene.js` mantiene lógica de compensación propia; revisar la jerarquía activa y evitar llamadas combinadas antes de refactorizar.
5. **Fantasmas:** `RaceGhostModeScene.js` graba muestras relativas a `_ghostLapStartPerf` y las compara con `lapMs` de la vuelta. La misma referencia desplazada al reanudar es importante para no desfasar el replay.
6. **Controles de trayectoria:** la meta requiere checkpoints en orden y dirección, con cooldown. Es una barrera útil, pero no sustituye una auditoría temporal ni la verificación de las marcas subidas al servidor.

## Orden de trabajo propuesto (antes de alterar la competición pública)

- Fase A: extraer y probar un **instante único de cruce** a partir de la intersección segmento/puerta; usarlo para salida, sectores y meta, con un único reloj de sesión y pausas coherentes.
- Fase B: diferenciar incidencia de frames (marca a revisar) de simple baja tasa de FPS; definir criterio de elegibilidad y registrar `frameGapMs`, `pauseMs`, versión de físicas, geometría, checkpoints y motivos de invalidación.
- Fase C: probar una misma trayectoria determinista a 60/30/15 FPS, con bloqueos de 1/3 segundos, pausas, cambio de app, y comparaciones de reloj, fantasma, delta y registro online; fijar tolerancia y límites antes de publicar.
- Fase D: comprobar reglas del servidor Supabase/Edge Functions: no confiar en un `lapMs` escrito por cliente sin validación de entrada/CP/fin, controles antitrampa y edición del circuito.

## Prueba asociada

```sh
node scripts/race-timing-audit-smoke.mjs
node scripts/race-pause-timing-smoke.mjs
```

Los test sintéticos prueban invariantes del software, **no** que un terminal real esté cronometrando ya con precisión competitiva.

## Estado

**AUDITADO, NO HOMOLOGADO.** Reloj monotónico confirmado; pausa coherente cubierta por test. Requieren trabajo adicional la interpolación de cruces, la respuesta a pérdida de fotogramas, las pruebas de dispositivo y la validación del servidor. No se borran ni modifican registros existentes.
