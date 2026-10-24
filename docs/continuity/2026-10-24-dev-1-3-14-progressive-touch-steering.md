# DEV 1.3.14 — Dirección táctil progresiva SIN análisis de pista

## Feedback y decisión de producto, 24/10/2026
El propietario nota cabeceos zigzag al tratar de volver a la recta tras una curva. Aunque el indicador ya se centra al soltar, el coche conserva rumbo propio y pequeñas correcciones son difíciles. Propuso que cada movimiento del dedo tenga **menor efecto en recta que en curva** y advirtió que consultar constantemente la geometría podría provocar tirones, especialmente en iPhone.

Se descartó explícitamente la asistencia automática a la orientación del coche que se había iniciado en commits anteriores; **nunca entró en una DEV publicada**. Se eliminaron `src/game/controls/straightExitAssist.js`, su smoke y la integración correspondiente en `RaceWheelModeScene.js`. No hay corrección de rotación, centrado de pista ni consulta al centerline.

## Implementación eficiente
- `src/game/controls/relativeSteeringGesture.js`: mantiene recorrido virtual simétrico de 60 px desde neutro hasta giro máximo y zona muerta de 5 px, pero cambia `Math.pow(normalized,1.18)` por `Math.pow(normalized,1.8)`. Por tanto, desplazamientos pequeños producen correcciones menores y los amplios recuperan progresivamente el 100 % de dirección. Funciona en ambos sentidos e invertido, respetando la sensibilidad guardada.
- **No lee circuito, posición, radio de curva, sensor, ni mapa.** La respuesta se calcula solamente al producirse `pointermove`; es una multiplicación/acumulación y un `Math.pow` por evento, sin `requestAnimationFrame`, `setInterval`, temporizadores nuevos o escaneos geométricos.
- `RaceWheelModeScene.js`: conserva el método exclusivo Dirección Táctil (preferencia interna `wheel` para compatibilidad), y cachea los ajustes de inversión/sensibilidad una sola vez por escena en vez de JSON.parse(localStorage) en cada movimiento de dedo.
- `scripts/touch-steering-relative-smoke.mjs`: comprueba correcciones leves con 12 px, respuesta intermedia con 30 px, giro amplio a 45-60 px, centro estable, control sostenido, izquierda/derecha, invertido, sensibilidad, liberación y que no exista la asistencia geométrica.
- Identificador: DEV 1.3.14. Las físicas, palanca, botones, mando, récords y publicadas Android no se modifican.

## Validación
Ejecutar smoke y el flujo Pages con verificación SHA en URL pública. Luego comprobar en iPhone la facilidad de mantener recta tras curva, la rapidez de inversión sin soltar, y la reacción suficiente en horquillas. El coeficiente exponencial 1.8 es experimental y debe ajustarse con sensaciones reales. No generar APK ni AAB sin petición.
