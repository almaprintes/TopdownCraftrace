# DEV 1.2.256 — prueba A/B del odómetro en Karting Tenerife

## Evidencia y límites
El propietario informa que DEV 1.2.255 sigue dando tirones en iPhone. El cuentakilómetros de la DEV 1.2.220 es un indicador **HTML**, implementado por `src/game/ui/raceInstrumentHud.js`, no un texto del HUD heredado de Phaser. El montaje del HUD activo se realiza desde `RaceTelemetryHudScene`, que retira las capas antiguas.

El odómetro actual lee distancia pendiente, consulta estadísticas guardadas cuando cambia el coche o se vacía el pendiente tras el flush de 12 s, ejecuta `formatOdometerKm`/`toLocaleString` y escribe `textContent` aproximadamente cada 80 ms. El dígito del odómetro cambia cada 10 metros, pero esas escrituras se repiten innecesariamente. Esto es trabajo verificable; **no hay aún medición que demuestre que sea la causa de los tirones**.

## A/B de una variable
En DEV, tocar el odómetro que aparece bajo el nombre del coche alterna:
- **ODO ON (normal)**: se mantiene exactamente el cálculo y repintado anterior.
- **ODO PAUSA (borde amarillo)**: se suspende únicamente la consulta, formateo y escritura visual del odómetro. Mientras tanto la distancia real y su persistencia continúan sin cambios, y el resto del HUD sigue funcionando.

Repetir varias veces en el mismo circuito, con una conducción comparable de 20–30 s por fase, inicialmente sin mostrar FPS. No cambia resolución, carrera, físicas, colisiones, pistas ni resto de indicadores. Un resultado igual en ON y PAUSA descarta el refresco del odómetro como explicación principal; una mejora consistente en PAUSA permite localizar la causa y luego sustituirlo por una actualización a demanda de cada 10 metros.

El control A/B solo existe en compilación DEV, no en producción. No se generan APK/AAB ni se publica Google Play. El script `scripts/odometer-ab-smoke.mjs` valida que el modo PAUSA no modifica `RaceMileageStatsScene`.

## Advertencia de continuidad
RaceTelemetryHudScene destruye `raceInfoHud`, `competitionHud` y otros HUD antiguos y monta el nuevo HUD DOM. Antes de atribuir una ganancia en iPhone a mejoras de `RaceStyledHudScene`/`RaceCompetitionHudScene`, verificar cuál es el verdadero camino de renderizado. No declarar recuperación sin prueba iPhone.
