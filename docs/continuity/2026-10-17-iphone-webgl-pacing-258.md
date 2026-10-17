# DEV 1.2.258 — iPhone WebGL present mode A/B y observabilidad

## Reportes reales
- Grabación DEV 1.2.257: FPS variables ~14–52, picos ~80+ ms, UPDATE CPU ~1 ms, RENDER CPU ~0.1–0.3 ms. HUD OFF y FOTO OFF **no eliminan** picos: no permite imputarlos solo a UI ni a WebP. RENDER CPU es envío CPU, no tiempo de GPU.
- Propietario: había seleccionado **Ultra** y lo bajó a **Alta**; los tirones **persisten iguales**. En `iosRaceRenderBudget`, ambos ajustes tienen `fpsLimit=0`; Ultra renderiza a 1.5 de resolución y Alta a 1.0 en iPhone compacto. No parece que la cantidad de píxeles del framebuffer sea la única causa.

## Experimento enfocado
`src/game/game.js` solicitaba `render.desynchronized: true` para iOS (desde el experimento del 28/08/2026). No se presume que esa pista sea la causa. La opción solo existe al **crear** el contexto WebGL; hacerla A/B desde DEV requiere recargar el juego.

En `src/game/performance/iosWebglPresentationMode.js` queda el modo predeterminado **DESYNC** (sin cambios frente a la DEV anterior). La tecla local `tdr2:devIosWebglSync:v1='1'` cambia a modo **SYNC**; nunca afecta build production ni Android. En el panel MEDIR de iPhone se muestra:
- Preset, resolución, `fps.limit`, safe mode, `forceSetTimeOut` y si el FPS HUD legado está ON en ajustes.
- WebGL DESYNC/SYNC solicitado y atributo real del contexto si WebKit lo expone.
- Botón **PROBAR WEBGL SYNC (REINICIA)** / **VOLVER WEBGL DESYNC (REINICIA)**. No se toca motor en carrera ni física, colisiones, imágenes o calidad.

Además se desactiva en DEV iOS la instalación del antiguo `racePerformanceProbe` que contiene un *segundo* `requestAnimationFrame` cuando el usuario activó `video.showFPS`. La herramienta `MEDIR` es ahora el único diagnóstico recomendado en iPhone; esto evita que la prueba en sí introduzca otro RAF competidor. Otros dispositivos no cambian.

## Prueba
Con calidad Alta, MEDIR activado y foto/HUD ON, grabar o copiar 20 segundos de **WEBGL DESYNC**, pulsar **PROBAR WEBGL SYNC (REINICIA)**, entrar otra vez al mismo circuito/coche y comparar 20 segundos. Si el campo WEBGL real no cambia, WebKit ignoró la pista y no se debe sacar conclusión causal. La recuperación concluyente depende de prueba iPhone; no confundir CI verde con FPS verificados.

Solo main, DEV 1.2.258 y GitHub Actions green, sin APK ni Google Play.
