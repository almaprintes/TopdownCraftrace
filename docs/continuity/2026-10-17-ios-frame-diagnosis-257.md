# DEV 1.2.257 — diagnóstico de tirones en iPhone, sin cambiar el juego

El propietario probó DEV 1.2.256: el modo ODO PAUSA **no elimina los tirones**; a veces parecen desaparecer transitoriamente al tocar el control, pero vuelven. El odómetro deja de ser el principal sospechoso. No inferir causas del breve efecto táctil.

## Hallazgo de arquitectura
`RaceTelemetryHudScene` retira el HUD Phaser antiguo (RaceFixed/Competition/Profiler y textos) e instala `raceInstrumentHud.js` DOM real. El profiler integrado en capas heredadas no permanece visible y las optimizaciones de ese HUD antiguo no prueban que la carrera final fuese más rápida.

## Instrumentación nueva
`src/game/dev/iosRaceFrameDiagnostics.js` instala solo en DEV de iPhone/iPad un botón **MEDIR** en carrera; no activa ningún segundo loop `requestAnimationFrame` ni altera físicamente el juego. Solo mientras MEDIR está abierto recopila:
- **FRAME** intervalo entre dos POST_RENDER y FPS medios.
- **UPDATE CPU** tiempo invertido por el `update` de la escena concreta más derivada (`RaceEmbeddedReplaySceneV2`), incluyendo física, clases envolventes, audio de motor y la actualización DOM.
- **RENDER CPU** tiempo de pared entre `PRE_RENDER` y `POST_RENDER`. No es medición de GPU ni de presentación real en pantalla.
- **OTROS** diferencia de frame menos update/render, con tiempo de espera RAF/vsync. Su tamaño por sí solo no demuestra atasco.
- Cuenta de frames superiores a 33 y 50 ms, y total de mosaicos fotográficos.

A/B de una variable, reiniciando muestras cada vez:
1. **BASE · HUD ON · FOTO ON**, conducir 20 segundos.
2. **HUD OFF**, ocultar y suspender solo HUD DOM; mantener controles, fotos y física. Conducir 20 segundos.
3. Volver a **HUD ON**. Pulsar **FOTO OFF** y observar frame rate unos segundos en recta/parado. Oculta solo sprites de fotografía, sin liberar texturas ni modificar posiciones/collisiones/física. **No intentar conducir sin poder ver la carretera**.
4. Volver a FOTO ON y comparar. Tomar capturas de los resultados en cada modo o pulsar COPIAR.

La casilla ODO ON/PAUSA de DEV 1.2.256 sigue disponible, pero las mediciones del siguiente paso deben usar ODO ON igual en todas las fases. Nunca tocar Google Play, assets originales, física, checkpoints, coches ni telemetría de perfil. El modo diagnóstico no existe en production y su cleanup restaura HUD/foto y elimina listeners. Integración comprobable vía `scripts/ios-frame-diagnostic-smoke.mjs`.

## Interpretación
Si HUD OFF mejora mucho, investigar rasterización/layout DOM. Si FOTO OFF mejora, evaluar GPU fill/texel bandwidth, WebKit/zoom y tamaño tiles; no deducir por sí solo memoria. Si ambos iguales y UPDATE CPU presenta picos, investigar `RaceScene.update` y runtime (sistemas, colisiones, audio). Si FRAME alto con UPDATE/RENDER bajos, medir con Safari Web Inspector y revisar rAF/WebKit/thermal throttling; la categoría OTROS incluye vsync/espera. CI verde jamás confirma fluidez en iPhone.

## Revisión técnica de la instrumentación
Se detectó que tomar el tiempo solo en `RaceTelemetryHudScene.update` excluía las capas de juego posteriores de la cadena de herencia. Se mueve la medición mediante `installFinalRaceFrameDiagnosticUpdate(this.constructor)` al `update` de la clase Phaser más derivada. Solo se ejecuta `performance.now` en el wrapper al abrir MEDIR; de otro modo pasa directamente al método original. La versión continúa siendo 1.2.257.
