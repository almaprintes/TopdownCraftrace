# TDR iOS — Auditoría estática del pipeline gráfico y captura de cámaras
**Fecha:** 2026-11-01. Estado: rama aislada `diagnostics/ios-render-readonly-2026-11-01`, **sin publicar ni fusionar**. No se cambian física, control, juego visual, Android ni producción.

## Evidencia establecida
- Apple Power Profiler + Instruments: TDR **44,08%/h** tasa de consumo energética global media durante ~97s frente a **7,97%/h** durante una grabación de Ultimate Racing ~376s (comparación no estrictamente controlada). TDR cambió de estado térmico `Nominal` a `Fair` a ~55s; Ultimate permaneció `Nominal`. Causa CPU vs GPU **no identificada**.
- `src/game/game.js`: iPhone 16 Pro Max en preset alto tiene resolución framebuffer **1.5** y un `fps.limit = 0`. El límite 0 no demuestra que esté dibujando a 120 FPS; `requestAnimationFrame` y presentación dependen del navegador. Un A/B de cap 60 se ha preparado **por separado en PR #32** (no fusionada).
- `src/game/performance/iosPhotoTileBudget.js` y `src/game/tracks/imageNativeRaceLoader.js`: el plan de circuitos fotográficos usa WebP cortados; en iPhone usa las variantes compactas al **65%** y escala de coordenadas en mundo. Tras la carga, `scene.uiCam.ignore(sprite)` evita que la cámara del HUD dibuje las fotografías, y `_destroyLegacyGroundRender` elimina fondos antiguos. Es una **defensa presente en código**, no evidencia de rendimiento medido.
- `src/game/scenes/RaceScene.js` establece cámara UI adicional; en general, otros GameObjects podrían aparecer en ambas cámaras y necesitar `ignore`. El listado nativo de Phaser `Camera.renderList` informa de los objetos renderizados por cada cámara, sin indicar draw calls de GPU.
- `src/game/scenes/RaceEmbeddedReplaySceneV2.js` invoca `_tdrSyncGamepadUi()` en cada frame iOS, y `_tdrHideResidualPhaserSteering()` hasta **dos veces por frame**, pero esta última devuelve inmediatamente si no está seleccionado mando. La primera lee la configuración de controles localStorage; el segundo ciclo de recorrido de objetos solo ocurre con modo mando activo. En Android carrera normal existe bypass. **No atribuirle el gasto energético sin medir**.
- `src/game/scenes/RaceRealSurfaceAssetsScene.js` aplica una comprobación de materiales de Atlántico por frame; para circuitos distintos vuelve sin reconfigurar visuales, y en Atlántico fotográfico la bandera `_beautyLayerActive` hace retorno temprano.

## Instrumentación preparada, bajo demanda
- `src/game/performance/iosRenderAuditSnapshot.js` obtiene:
  1. Dimensiones del canvas de Phaser y drawing buffer WebGL (si disponible).
  2. Cantidad de entradas **únicas** en `Camera.renderList` de principal y UI, junto a la intersección de objetos.
  3. Número de mosaicos de fotografía registrados, y en cuál cámara figuran.
  4. Estimación de memoria de mosaicos RGBA8 (número de píxeles * 4), no memoria GPU real.
- `src/game/dev/iosRaceFrameDiagnostics.js` añade botón **INSPECCIONAR RENDER** al panel DEV ya existente, solo en iOS, sin alterar el flujo de fotogramas. No utiliza `gl.finish`, `readPixels`, `getParameter`, ni re-render. Se obtiene una muestra solo al pulsar y se incluye en **COPIAR**; no añade un segundo RAF ni un contador siempre activo.
- `scripts/ios-render-audit-snapshot-smoke.mjs` comprueba cámara principal, UI, objetos compartidos, conteo de mosaicos, estimación RGBA y que los listados son inmutables.

## Interpretación y pasos de prueba
1. Cuando haya forma de instalar una build DEV actual de la misma rama (iPhone iOS Capacitor), abrir diagnóstico carrera (Ajustes > Vídeo, 7 pulsaciones sobre Calidad Gráfica en 5s); MEDIR y, durante la carrera, INSPECCIONAR RENDER > COPIAR. Registrar circuito verdadero, coche, ajustes, resolución, FPS, contador MAIN, contador UI, compartidos y FOTO en UI.
2. **Si FOTO UI > 0**, hay objetos fotográficos que aparecen en la cámara del HUD y se debe revisar `ignore()` en el momento de montar foto. Si compartidos > 0, inspeccionar qué objetos son: algunos pueden ser UI deliberada; no significa automáticamente duplicación innecesaria.
3. Si cifras de ambas cámaras no muestran exceso, priorizar A/B FPS 60 en PR #32, y usar una traza Metal/Instruments **específica del proceso** desde un iPhone conectado para distinguir coste GPU vs WebKit/presentación. `Power Profiler` de la sesión actual no exportó desglose por subsistema del proceso.
4. No seguir haciendo tandas largas si el iPhone vuelve a calentarse mucho; abortar con signos de sobretemperatura.

**Límite:** test estático / instrumentación preparada, **sin ejecución en iPhone**. La instalación nativa del usuario puede basarse en un snapshot local anterior a GitHub, y un commit en GitHub no actualiza por sí solo la aplicación firmada del iPhone.

Referencia documentación Phaser 3.90: https://docs.phaser.io/api-documentation/3.90.0/class/cameras-scene2d-basecamera (propiedad renderList; no modificarla).

## Hallazgo de mayor prioridad: orden de creación de la cámara HUD

Comprobación estática contra `src/game/scenes/RaceScene.js` de `main`, confirmada por `node scripts/ios-camera-creation-order-smoke.mjs`:

- `uiCam` se crea en la zona de la línea **2886** (después de crear varios objetos gráficos del mundo); se resetea a `null` en el cierre de la escena.
- Las seis invocaciones `this.uiCam?.ignore?.(...)` para `_shoulderLeft`, `_shoulderRight`, `_curbOuter`, `_curbInner`, `finishGfx` y `cpGfx` figuran **ANTES de la creación** de `uiCam`. Con `uiCam` ausente, el operador `?.` las convierte en operaciones nulas.
- Después hay dos mecanismos correctivos: se ignoran `bgOff`, `bgGrass`, `_grassMaskGfx` y, en `_applyCameraIgnores`, `bgWorld`, `carRig` y `finishGfx`. Esto **sí recupera finishGfx**, pero **no recupera explícitamente** las exclusiones de `_shoulderLeft`, `_shoulderRight`, `_curbOuter`, `_curbInner` ni `cpGfx`.
- `finishLineDebug` y `gridDebug` también intentan `uiCam?.ignore?.()` antes de la creación, sin inclusión en `_applyCameraIgnores`. En las carreras foto, los mosaicos **sí** se crean después de `uiCam` y se ignoran correctamente allí.
- **Consecuencia verificable del código:** varias entidades gráficas del mundo pueden quedar elegibles para renderizado por `uiCam` debido al filtro de cámara sin configurar. Que la cámara UI finalmente renderice alguna en un frame, el número real de draw calls y su coste GPU/energético **todavía no están medidos**. La cámara UI trabaja con scroll 0, zoom 1; objetos fuera de ese viewport podrían no contribuir aunque no estén excluidos.
- Fuente Phaser 3.90: https://docs.phaser.io/api-documentation/3.90.0/class/cameras-scene2d-basecamera (`Camera.ignore` modifica el `cameraFilter`; `Camera.renderList` refleja lo que se ha renderizado por esa cámara). **No realizar corrección visual directa antes de observar el renderList.**

### Instrumentación mejorada para aislar la hipótesis
La lectura manual `INSPECCIONAR RENDER` de este PR ahora informa:
- `UI MUNDO`: objetos con desplazamiento de cámara que figuran en la lista de render de la cámara UI;
- `COMPARTIDOS MUNDO`: objetos de mundo presentes en las dos listas, con hasta 12 ejemplos `tipo/textura/profundidad`;
- `NOMBRADOS MUNDO` y `NO EXCLUIDOS DE UI`: recuento de objetos concretos (`cpGfx`, `_curbOuter`, `_shoulderLeft`, `gridDebug`, `gridCars[].rig`, etc.) cuyo `cameraFilter` no excluye la segunda cámara, incluso si están fuera de pantalla. Incluye hasta 14 ejemplos de objetos.
- `PRESENTES UI`: los objetos concretos anteriores reportados por `renderList` de UI.
- No cambia `cameraFilter`, listas, shaders, cámaras, física, textura ni controles, y sigue siendo una foto puntual al tocar el botón. Los nombres de objetos no deben confundirse con *tiempo GPU*.

### Validación
- `scripts/ios-camera-creation-order-smoke.mjs`: 6 llamadas prematuras y ausencia de 5 exclusiones de la rutina correctiva; test estático.
- `scripts/ios-render-audit-snapshot-smoke.mjs`: verifica clasificación de filtros/objetos compartidos, ejemplos y no mutación de listas.
- GitHub Actions (no deploy) `41298411260` completado correctamente.
