# DEV 1.2.108 — Foto maestra limpia + retirar botón VER REPETICIÓN

Fecha: 11/10/2026. Fuente de verdad: `main`. Destino: PWA DEV, sin SDK/APK ni cambios en Play Store 1.1.188.

## Observaciones del iPhone
- Tras retirar los props heredados en .107, seguían marcas de sector/lineas y meta generadas por el HUD y gráficos del circuito procedural. Los pianos y marcas físicas **ya existen en la fotografía**.
- En una nueva vuelta rápida aparecían dos piezas desalineadas: un recuadro negro de borde cian en el extremo derecho y texto «▶ VER REPETICIÓN» suelto a la izquierda.

## Causas comprobadas
- `RaceStyledHudScene` genera gráficos nuevos `finishIntegratedGfx`, `cp1IntegratedGfx` y `cp2IntegratedGfx` para cualquier circuito, también `karting-tenerife-studio`.
- `RaceScene` genera las antiguas `finishGfx`, `cpGfx`, `startLineDebug` y `gridDebug`. La limpieza del fondo procedural no los retiraba.
- `RaceGhostModeScene._ensureReplayEntryButton()` creaba un botón con `_makeReplayButton(...,'▶ VER REPETICIÓN',...)`. Su contenedor de Phaser desplazaba visualmente el texto y el rectángulo de forma independiente en ciertos layouts móviles.

## Correcciones
1. La foto activa `clearImageNativeTrackOverlays(scene)`: destruye las capas legacy, gráficos de pianos/arcenes/bordes y las dos generaciones de puertas visuales, manteniendo las puertas lógicas, la física y los datos de progreso.
2. `RaceStyledHudScene` comprueba `isImageNativeTrackScene` y no crea meta/sector **visuales** en este modo. El resto de las pantallas, minimapa y HUD mantienen funcionamiento.
3. Se elimina por completo el **acceso directo flotante** «VER REPETICIÓN» de `RaceGhostModeScene`, incluidos su método creador y llamada tras cargar o registrar ghost. Se conserva el grabador del fantasma, los récords y los controles de repetición auténticos que se usan en otras pantallas.
4. Se preservan la imagen, centerline, bordes editados, checkpoints, rankings históricos y los circuitos clásicos. No se modifica el paquete `.tdrtrack`.

## QA
- `scripts/trackstudio-image-native-clean-visuals-smoke.mjs` verifica que se destruyen 21 objetos visuales de prueba, sin alterar `finishLine`, checkpoints ni física.
- Verifica ausencia del texto/button heredado y permanencia de guardado de ghost y reproducción existente.
- GitHub Actions debe completar Build y Deploy sobre el HEAD exacto de `main`.
- Validación pendiente en iPhone: nueva entrada desde TrackStudio, vuelta completa, nuevo récord, observar que no queda fondo oscuro ni texto flotante y sólo se ve la decoración pintada de la imagen.
