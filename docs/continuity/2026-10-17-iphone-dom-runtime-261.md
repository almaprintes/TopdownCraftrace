# DEV 1.2.261 — retirar barridos DOM globales por fotograma

## Evidencia previa
En DEV 1.2.260, capturas iPhone de la misma sesión y Spark/Karting Tenerife:
- MOTOR OFF, HUD ON, FOTO ON: ~33.6 FPS, 122 picos >50ms/967 frames.
- MOTOR OFF, HUD OFF, FOTO ON: ~47.3 FPS, 66 picos >50ms/1933 frames.
- MOTOR OFF, HUD OFF, FOTO OFF: ~57.1 FPS, 0 picos >50ms/688 frames.
- MOTOR ON, HUD ON, FOTO ON: ~45.3 FPS, 47 picos >50ms/1370 frames.
No equivalen a tests idénticos por duración/carga; confirman que quitar todas las capas visuales mejora; aún no permite culpar una función específica.

## Cambio focalizado
`src/ui/liveDeltaToggle.js` (DELTA/PAUSA):
- Eliminar su **requestAnimationFrame permanente** que llamaba `retireLegacyDomDelta`, `positionControl`, `polishPanel` y `positionPanel` hasta 60 veces/s.
- Retirar observación de style/class a todo `body`, que realimentaba escrituras propias. Conservar observación `childList` filtrada para detectar montaje/retirada de controles, botón pausa, HUD y reportes. Mutaciones de Ghost, cronómetro y puente HTML no ejecutan `apply`.
- Escaneo completo de etiquetas obsoletas DELTA solo una vez en boot; luego solo subárbol añadido que contenga DELTA. Reutilizar referencia del botón pausa y su rectángulo; actualizar posiciones en transición / resize / orientación / cambio de viewport.
- Fallback de estado visual cada 450ms solo si cambia carrera/panel o falta ancla de pausa; sin recalcular geometría, ocultar nodos ni reescribir estilos en cada tick.
- Mantener el botón DELTA y PAUSA, posicionamiento Android específico, despliegue y plegado de DELTA, preservación durante pausa, informes y layout original.

`src/game/scenes/RaceStaticGhostStatusScene.js`:
- Solo asignar texto, opacity y cursor cuando cambia; cortar la sincronización POST_UPDATE DOM a 120ms si hay ancla o a 350ms mientras se busca ancla, sin afectar toques manuales.
- Evitar volver a ocultar objetos Phaser ya ocultos.

Pruebas de regresión: `scripts/ios-dom-runtime-smoke.mjs` integrado en `prebuild`. No se tocaron fotografías, WebGL, físicas, audio, odómetro ni otras capas. Despliegue únicamente PWA DEV desde `main`; sin Play/Android.

## Interpretación y continuación
Probar misma calidad, mismo circuito/coche, HUD y fotografía **ON**, con motor ON, durante 30–60 s sin medir (sensación), luego medir y comparar FPS / frames >33.4 / >50ms con 1.2.260. Una mejora medible y reproducible respalda reducción de sobrecarga DOM; no garantiza que elimine todos los tirones. Si no basta, próximo candidato aislado es el `htmlTextRuntime.js` RAF y la composición WebGL iOS; no reducir imágenes por defecto.
