# TDR — Diagnóstico de tirones y calentamiento en iPhone
**Fecha de pruebas:** 2026-11-01, 00:14–00:37 WET (Canarias).
**Estado:** documentación de evidencia; SIN cambio de código de juego, compilaciones ni publicación.
**Objetivo:** ganar fluidez en iOS sin alterar Android, físicas, controles, interfaz ni producción.

## Contexto y restricciones
- Proyecto: Top Down RACE: CraftRace; código compartido Phaser 3 + Vite + Capacitor.
- Equipo de pruebas iOS: iPhone 16 Pro Max, DEV; carreras de 2 vueltas en **Karting Américas**, mismo coche **HÉLIX Spark** básico y sin equipamiento, según jugador. En Android el movimiento se siente fluido; en iPhone el usuario percibe tirones, aunque menores que anteriormente.
- Las imágenes de resultados de carrera comparadas antes de activar el diagnóstico mostraron tiempos parecidos (iOS: vueltas 36.914 s y 35.419 s, suma 72.333 s; Android: 37.854 s y 35.149 s, suma 73.003 s). **No son pruebas de FPS** ni prueban igualdad de carga.
- **No cambiar ni rediseñar la interfaz**: expresamente descartado por el usuario. Las distintas posiciones visuales de títulos en capturas no son incidencia a tratar aquí.
- **Android estable: no tocar.** Evitar tocar física, velocidad, circuitos, lógica de carreras, cronometraje o progresos para resolver síntomas iOS.
- El dispositivo reporta DPR 3, sin memoria RAM ni batería disponibles en navegador; diagnóstico no mide GPU directamente ni dispone de lectura térmica.
- **Discrepancia de identificación:** el piloto confirma que corre en Karting Américas, pero los tres informes dicen `CIRCUITO CIRCUITO ATLÁNTICO`. Investigar metadatos del circuito del informe por separado, sin asumir que se cargó el circuito equivocado ni tocar UI.

## Tres mediciones reales copiadas del diagnóstico

| Campo | Prueba A, base | Prueba B, RES 1.0 | Prueba C, RES 1.0 + petición WebGL SYNC |
|---|---:|---:|---:|
| Inicio WET | 00:14:49 | 00:23:57 | 00:34:09 |
| Fin WET | 00:16:36 | 00:26:04 | 00:36:22 |
| Duración registrada | 1m 46s | 2m 06s | 2m 12s |
| Fotogramas | 5,393 | 6,455 | 6,931 |
| FPS medios | 50.5 | 51.0 | 52.3 |
| FRAME promedio / máx | 19.8 / 205.0 ms | 19.6 / 110.0 ms | 19.1 / 95.0 ms |
| ESCENA CPU promedio / máx | 0.7 / 45.0 ms | 0.8 / 88.0 ms | 0.6 / 67.0 ms |
| PASO CPU promedio / máx | 0.8 / 45.0 ms | 0.8 / 88.0 ms | 0.7 / 67.0 ms |
| RENDER CPU promedio / máx | 0.2 / 12.0 ms | 0.2 / 8.0 ms | 0.2 / 10.0 ms |
| OTROS promedio / máx | 18.8 / 203.0 ms | 18.6 / 85.0 ms | 18.3 / 94.0 ms |
| Fotogramas >33 ms | 448 (8.31%) | 560 (8.68%) | 492 (7.10%) |
| Fotogramas >50 ms | 119 (2.21%) | 107 (1.66%) | 107 (1.54%) |
| P95/P99 aproximados | 39 / 61 ms | 40 / 54 ms | 37 / 56 ms |
| Ráfagas >50ms | 101 | 96 | 92 |
| Máx seguidos >50ms | 4 | 3 | 4 |
| Máx seguidos >33ms | 6 | 7 | 6 |
| Render resolution, modo | high, 1.5 BASE | high, 1.0 PRUEBA | high, 1.0 PRUEBA |
| WebGL solicitado | DESYNC | DESYNC | SYNC |
| WebGL real | NO DISPONIBLE | NO DISPONIBLE | NO DISPONIBLE |

**Común a las tres pruebas:** HUD ON, FOTO ON, MOTOR ON, TEXTO PHASER; 6 tiles; RAF para bucle de juego; FPS limit 0; SAFE NO (inactivo); TIMER NO; FPS HUD OFF; WebAudio engine running, 6 sources, rpm-bank; TEXTOS PHASER, RAF OFF, nodos 50; 0 salidas al segundo plano; sin sensor térmico, temperatura manual SIN INDICAR.

### Incidencias cualitativas registradas
1. **Prueba A (resolución 1.5):** iPhone con tirones perceptibles; usuario percibió mejora respecto a versiones anteriores, pero Android sigue siendo claramente más suave.
2. **Prueba B (resolución 1.0):** reportó **calentamiento muy intenso del iPhone**. Se recomendó detener pruebas hasta enfriarse. El cambio no eliminó los tirones; pequeño cambio de FPS y reducción de algunos extremos, sin mejora clara del P95.
3. **Prueba C (WebGL SYNC solicitado, resolución todavía 1.0):** durante la segunda vuelta **se pausó manualmente la carrera y se reanudó**. Usuario percibió **mucho lag después de reanudar**, y volvió el calentamiento. Informe: `SEGUNDO PLANO 0 salidas`, que **no descarta** efectos de pausa interna. El usuario inicialmente creyó que había vuelto a 1.5, pero el dato registrado prueba `RES 1 · RES PRUEBA 1.0`.
4. El calor puede ser acumulativo: las pruebas se efectuaron en la misma noche. No hay lectura objetiva de temperatura o throttling. **No atribuir causalidad** a bajar resolución, WebGL o pausa con estos datos.

## Interpretación (certeza y límites)
- **Confirmado:** promedio 50.5–52.3 FPS, fotogramas con latencias superiores a 33 y 50 ms frecuentes; tirones compatibles con percepción del jugador.
- **Confirmado:** la reducción 1.5→1.0 **no resolvió** la irregularidad; P95 39→40 y solo +0.5 FPS entre A y B. No justificar reducir más la fidelidad gráfica sin evidencia.
- **Confirmado:** tiempos reportados de escena y render JS son bajos *en promedio*; `OTROS` ocupa la mayor parte de la latencia. **No equivale** a prueba de cuello de botella GPU; los tiempos de GPU, espera de sincronización, scheduler y carga del sistema no están aislados.
- **Inconcluyente:** C presenta algo mejores promedios y tasa >33 ms, pero la prueba no es comparable por pausa manual, diferencia de duración, temperatura previa y la configuración real WebGL no verificada.
- **Sospechas a investigar, sin diagnóstico definitivo:** frame pacing de RAF/WebKit; coste GPU/presentación y espera de vsync; calor o limitación térmica tras uso sostenido; comportamiento al pausar y reanudar juego/audio/carga.
- No hubo informe de GPU, temperatura, RAM ni métricas separadas antes/después de pausa.

## Código y pruebas que ya existen (verificar en HEAD antes de actuar)
- `src/game/game.js`: configuración Phaser; iOS actualmente registra `fps.limit=0` en perfil alto, `requestAnimationFrame` y `powerPreference:'high-performance'`; Android selecciona otros límites por perfil mediante `androidFrameBudget`.
- `src/game/performance/iosRaceRenderBudget.js`: presupuesto específico para iPhone compacto con `screenMin<=430`; iPhone 16 Pro Max podría quedar fuera, de acuerdo con el modo RES 1.5 observado.
- `src/game/performance/iosDevResolutionTrial.js`: A/B exclusivo iPhone DEV: 1.5→1.0, con retorno a RES BASE.
- `src/game/performance/iosWebglPresentationMode.js`: A/B WebGL SYNC/DESYNC solicitado; el atributo real resultó `NO DISPONIBLE`.
- `src/game/performance/iosDevLoopDriver.js`: A/B iPhone DEV RAF / setTimeout, actualmente RAF; no cambiar a la vez que otros parámetros.
- `src/game/dev/iosRaceFrameDiagnostics.js` y `src/game/support/supportRaceDiagnostics.js`: diagnóstico en carrera que se desbloquea con 7 pulsaciones en «CALIDAD GRÁFICA» en Ajustes → Vídeo en menos de 5 s; vale 30 min; en carrera MEDIR → MINIMIZAR → VER DATOS → COPIAR.
- Comprobaciones disponibles en scripts `check:ios-frame-diagnostic`, `check:ios-resolution-pacing`, `check:ios-webgl-pacing`, `check:ios-loop-driver`, `check:support-diagnostics`.

## Plan para continuar las pruebas el 2026-11-01 (misma mañana)
1. **Dejar enfriar el dispositivo y no continuar pruebas cuando esté excesivamente caliente.** Durante las pruebas de la mañana, detenerse si se recalienta.
2. **Reconciliar configuración activa al entrar**: la última medida mostraba `RES 1.0 PRUEBA` y `WEBGL SYNC solicitado`, aunque el estado real SYNC es desconocido. Con controles DEV regresar a `RES BASE (REINICIA)` y `VOLVER WEBGL DESYNC (REINICIA)` para recuperar situación inicial antes de cualquier nueva comparación. Cada acción reinicia el juego.
3. Para comparar correctamente, mantener mismo circuito Karting Américas, coche HÉLIX Spark, calidad high, HUD/FOTO/MOTOR ON, duración comparable; arrancar con iPhone frío y apuntar **calor al tacto** al inicio y al final. Medir con captura/informe completo. Evitar pausas y cambios simultáneos durante el A/B de base.
4. **Prueba aislada de pausa** solo si la temperatura lo permite: medir tramo antes/pausa/después por separado en condiciones comparables; distinguir pausa interna de aplicación en segundo plano; comprobar si hay tareas/temporizadores/audio/loop acumulados tras reanudar.
5. **Inspección de código** del flujo de pausa/reanudación y de políticas iOS de frame pacing y GPU. Preparar A/B **iPhone DEV exclusivamente** de un límite efectivo 60 FPS si está justificado; no confundir `fps.target` con `fps.limit` y no asumir que un tope de 60 resolverá el calor.
6. Ejecutar smoke tests relevantes; comprobar que cualquier cambio sea exclusivo iOS, reversible, probado; **no tocar Android**, interfaz, físicas, ni producción sin pruebas.
7. Revisar incidencia aislada de etiqueta de circuito `CIRCUITO ATLÁNTICO` reportada para una sesión confirmada Karting Américas.

## Cuarta medición: mañana del 2026-11-01, RES BASE y WEBGL DESYNC solicitados

**Informe recibido a las 07:47 WET.** Inicio 07:45:33, fin 07:47:01, duración 1m 27s; 4.830 fotogramas, 55,0 FPS, FRAME 18,2 / 78,0 ms (media/máximo), ESCENA CPU 0,6 / 58,0 ms, PASO CPU 0,7 / 58,0 ms, RENDER CPU 0,2 / 9,0 ms, OTROS 17,3 / 68,0 ms. Fotogramas >33 ms: 186 (3,85 %). Fotogramas >50 ms: 18 (0,37 %). P95/P99 32/44 ms. Ráfagas >50 ms: 18, máximo 1 seguido; máximo >33 ms: 2 consecutivos. TILES 6, DPR 3.

**Configuración confirmada:** MODO high, RES 1.5 BASE 1.5, FPS limit 0, LOOP RAF, WEBGL DESYNC solicitado (estado real NO DISPONIBLE), SAFE NO, TIMER NO, FPS HUD OFF, HUD/FOTO/MOTOR ON, TEXTO PHASER (RAF OFF, 50 nodos), audio running 6 fuentes rpm-bank, segundo plano 0, RAM y batería no disponibles. **Aún indica CIRCUITO ATLÁNTICO** en el informe aunque el piloto había identificado el trazado como Karting Américas en pruebas previas.

### Contraste principal: primera prueba nocturna vs cuarta matutina (ambas resolución 1.5, modo high, WebGL DESYNC solicitado)
- FPS: 50,5 → 55,0 (+4,5 FPS).
- P95: 39 → 32 ms; P99: 61 → 44 ms.
- >33 ms: 448/5393 = 8,31 % → 186/4830 = 3,85 %.
- >50 ms: 119/5393 = 2,21 % → 18/4830 = 0,37 % (~83 % menos *proporcionalmente*).
- Máximo intervalo: 205 → 78 ms.
- **Límite de inferencia:** prueba A duró 106 segundos y prueba D 87; tiempo desde sesión, temperatura ambiental, calor real al tacto y otros factores no están controlados. La mejora concuerda con la hipótesis de efecto térmico/uso continuado, **pero no demuestra causalidad**, ni que el iPhone estuviera frío al inicio; el usuario no ha indicado todavía sensación térmica al final de la prueba 4.

**Dato térmico confirmado por el piloto a las 07:48 WET:** el iPhone terminó la cuarta medición **caliente**, y se había enfriado rápidamente hasta quedar **templado** pocos minutos después. La recuperación rápida de temperatura no prueba por sí sola limitación térmica ni cuál es la fuente de calor.

### Próximo experimento recomendado
Ya sabemos que el iPhone terminó caliente pero se enfrió pronto. Evitar de momento sesiones de ~2 min sin justificación. Siguiente prueba breve recomendada (una variable): comparar MOTOR ON contra MOTOR OFF con misma resolución 1.5, WEBGL DESYNC solicitado, HUD/FOTO/TEXTO PHASER iguales, alrededor de 30–40 s en cada fase, sin pausar carrera, aprovechando que el botón MOTOR OFF suspende AudioContext y reinicia contadores del diagnóstico tras confirmar resultado. Controlar temperatura al tacto al inicio/fin, enfriar entre fases si necesario y **abortar si está muy caliente**. Advertencia: el orden de las fases y calor acumulado confunden una comparación, por lo que el A/B solo sirve de pista inicial. Alternativamente revisar el código de reanudación sin castigar el dispositivo. Comparar **tasas**, P95/P99 y ráfagas con la prueba 4 para ver si empeoran con mayor duración. Opcionalmente hacer mediciones por ventanas temporales reiniciando SOLO el contador del diagnóstico, si se puede hacer sin pausar/ocultar la app, pero eso añade intervención y dificulta comparabilidad. **No introducir cambios de código o más A/B hasta aislar temperatura/tiempo y pausa.**

## Quinta medición: 2026-11-01, MOTOR OFF, audio realmente suspendido
- Inicio 07:52:22 WET; fin 07:52:58 WET; duración de medición **35 s**; sesión app 8min 33s, carrera 1min 27s.
- **Confirmación de tratamiento:** `PERF iOS · HUD ON · FOTO ON · MOTOR OFF · TEXTO PHASER`; `AUDIO MOTOR OFF · CONTEXTO suspended · FUENTES 6 · rpm-bank`. Aunque persisten fuentes listadas, el contexto de WebAudio está suspendido.
- Fotogramas **1.914**, **54,3 FPS**, FRAME 18,4 / 80,0 ms, ESCENA CPU 0,7 / 24,0 ms, PASO CPU 0,7 / 24,0 ms, RENDER CPU 0,1 / 2,0 ms, OTROS 17,6 / 79,0 ms.
- >33 ms: 90 (**4,70 %**); >50 ms: 15 (**0,78 %**); P95/P99 33/48 ms (aprox.); 15 ráfagas >50 ms, máximo 1 seguido; >33 ms máximo 3 seguidos.
- Misma configuración general que prueba 4: RES 1.5 BASE 1.5, high, FPS limit 0, LOOP RAF, WEBGL DESYNC solicitado (real NO DISPONIBLE), SAFE NO, TIMER NO, HUD/FOTO ON, TEXTOS PHASER/RAF OFF/50 nodos, TILES 6, sin segundo plano; el informe vuelve a identificar erróneamente CIRCUITO ATLÁNTICO frente al Karting Américas indicado por el usuario para la investigación.
- **Lectura prudente:** comparada con la prueba 4, AUDIO ON (55,0 FPS, 3,85 % >33 ms, 0,37 % >50 ms, P95 32, P99 44), no se observa mejora con audio suspendido. **No es un A/B controlado:** sesiones independientes, 35 vs 87 s, aplicación lleva 8m33s, situación térmica inicial/final no indicada, y falta el informe MOTOR ON inmediatamente anterior **de la misma carrera**. No atribuir las diferencias exclusivamente al sonido ni declarar causalidad.
- **Pendiente inmediato (actualizado):** el piloto confirma que NO copió la fase MOTOR ON y que el teléfono volvió a calentarse bastante. No se le vuelve a pedir ese informe; evitar carreras repetidas hasta revisar en software. No tocar código de Android.

## Aclaración de la prueba 5 — 07:55 WET
- El usuario confirma que **solo copió el informe al final del minuto de prueba**; **no hay informe MOTOR ON** de la primera fase y no se debe pedir que lo recupere ni suponer resultados no guardados.
- La ventana del informe `MOTOR OFF` dura **35 s**, coherente con que el interruptor de motor **reinicia las estadísticas** al cambiar de estado. El tiempo acumulado de la carrera era **1m 27s**, pero no son 87 s medidos con MOTOR OFF.
- El usuario confirma que el **iPhone volvió a calentarse bastante** incluso durante la prueba con audio suspendido; antes había comunicado calentamiento tras la cuarta prueba y que se enfriaba rápido al dejar de jugar.
- Conclusión acotada: **apagar el motor no evitó los tirones ni el calentamiento perceptible en esta sesión**, pero **no basta para descartar una contribución del audio** al consumo porque el calor previo, la duración y el orden no están controlados.
- **Decisión:** detener pruebas físicas mientras el equipo esté caliente; auditar código de render/frame pacing, consumo sostenido y pausa/reanudación sin exigir más carreras. Mantener Android, física, UI y producción intactos.
- Inspección de código confirmada: `src/game/game.js` aplica FPS limit 0 a iOS en modo high, usa RAF y `powerPreference:'high-performance'`; el módulo `iosRaceRenderBudget.js` solo aplica presupuesto compacto a tamaños mínimos de pantalla <=430. Esto ofrece hipótesis para pruebas futuras **no prueba una causa térmica**.
- Próxima intervención propuesta, sujeta a verificación/implementación: test A/B exclusivo iPhone DEV (pacing limitado/alternativo) con restauración segura, sin tocar Android ni producción. No se ha implementado dicho test todavía.

## Comparador externo: Ultimate Racing 2D 2 — 08:02 WET, 2026-11-01
- **Nueva observación reportada por el piloto:** jugó **5 minutos** a Ultimate Racing 2D 2 **en el mismo iPhone 16 Pro Max**; percibió fluidez muy elevada y **prácticamente ningún calentamiento**. Contrasta con TDR, que genera calor perceptible y tirones en sesiones más cortas.
- **No es un benchmark controlado:** no hay FPS instrumentados, temperatura física, consumo energético, mismos assets ni igual pipeline. No atribuir el problema definitivamente a Safari, Phaser, GPU o hardware.
- **Referencia externa:** página iOS de Ultimate Racing 2D 2 (https://apps.apple.com/es/app/ultimate-racing-2d-2/id6473748115) confirma existencia para iPhone; ficha de ModDB (https://www.moddb.com/games/ultimate-racing-2d-2) lo clasifica bajo GameMaker Studio 2; esto no acredita cómo está compilada exactamente la variante iOS.
- **Inferencia justificada:** el hardware demuestra en uso observado que puede sostener *otro* juego 2D cenital con buena fluidez y baja sensación térmica durante 5 minutos. Motiva abordar la eficiencia particular de TDR (diferencias de render, pipeline web y coste de dibujo), no tratar el calentamiento como una imposibilidad inherente al iPhone.
- **Inspección de código TDR ya realizada:** los circuitos foto-nativos tienen optimización iOS de texturas WebP al 65% de cada dimensión y smoke-test `scripts/ios-race-photo-memory-smoke.mjs`; el pipeline iOS usa Phaser/WebGL con `powerPreference:'high-performance'`, RAF y `fps.limit=0`. **Precisiones:** `fps.limit=0` NO significa que el juego supere arbitrariamente la frecuencia de la pantalla: RAF suele acompasarse con refresco; limitar a 60 puede no cambiar el uso si la media medida es 50–55. El tiempo de `RENDER CPU` tampoco representa tiempo de GPU. Necesitamos mejores mediciones del coste real de presentación, lienzo, tamaño del framebuffer, operaciones de dibujo y eventual temperatura antes de elegir optimización.
- **Prioridad siguiente:** revisión de código de renderizado/construcción y duración de trabajo gráfico; preparar instrumentación DEV iPhone que no duplique bucles RAF ni añada carga significativa, y A/B reversibles estrictamente aislados de Android/prod. No sacrificar interfaz, arte, física ni controles sin evidencia.

## Último estado del usuario
- El dispositivo se enfrió una vez, pero en la prueba C volvió a calentarse.
- El usuario reanudó las pruebas a la mañana siguiente (2026-11-01), con la prueba 4 documentada arriba; calor final confirmado en 4 y 5; ahora priorizar auditoría de código antes de más carga térmica.
- No se ha probado todavía un límite iOS real de 60 FPS ni el modo LOOP TIMEOUT con condiciones controladas.
- Ningún informe presentado prueba que la pausa o WebGL sea la causa definitiva.

---
*Este documento conserva el estado de investigación sin adelantar conclusiones ni modificar el juego. No contiene datos privados del jugador.*

## 2026-11-01 — Rectificación verificada y prioridades (auditoría de la cadena de escenas)

**Rectificación importante:** antes se planteó que `uiCam` podía estar haciendo un segundo pase de renderizado del circuito porque varias llamadas `uiCam?.ignore?.()` aparecen antes de su creación. Ese orden de código es real, **pero la cámara no está activa en la carrera que estamos analizando**: `src/game/scenes/RaceFixedScene.js` ejecuta `this.uiCam.setVisible(false)` después de `RaceScene.create()`. La versión oficial de Phaser 3.90 confirma que una cámara invisible no renderiza. Así, **no atribuir consumo al duplicado de la cámara HUD**, ni aplicar cambios a ciegas en sus `cameraFilter`. El archivo `RaceFixedScene.js` es exactamente el mismo en el punto inicial iOS local `9181e72c` y `main` actual (blob Git `4ce483cc14814b44084873e7753c5ebc06924d8f`). Referencia: https://docs.phaser.io/api-documentation/3.90.0/class/cameras-scene2d-basecamera.

**Compatibilidad con copia local inicial iOS:** `iosPhotoTileBudget.js`, `RaceEmbeddedReplaySceneV2.js` y `scripts/build-ios-race-photo-tiles.mjs` también son idénticos entre `9181e72c` y `main`. La copia inicial **ya incluía** los mosaicos iPhone al 65 %, la lectura de WebP compactos y el apagado de la cámara HUD. Esto no garantiza que la app instalada sea exactamente el mismo binario ni que los assets compactos estén efectivamente presentes en los paquetes entregados a Xcode.

**Máscaras fotográficas:** `photoCanopyOcclusion.js` reutiliza las texturas ya cargadas y añade overlay con `GeometryMask`. Karting Américas tiene 1 canopyZone, Karting Tenerife 3 y Santa Cruz 13, mientras que Karting Canarias base no define ninguna. Como la queja abarca varios circuitos, las máscaras de copa tampoco explican por sí solas el fenómeno universal; sin datos GPU no excluir posible coste adicional en circuitos concretos.

**Estado de la instrumentación:** PR #33 (rama `diagnostics/ios-render-readonly-2026-11-01`) actualizado para registrar **cámaras visibles, escenas activas, dimensiones framebuffer, mosaicos COMPACTA/ORIGINAL, capas de máscaras** y objetos listados por cámaras. Incluye aviso explícito de `uiCam` invisible; pruebas de solo lectura y de orden de cámara en GitHub Actions correctas (run `41299478920`). **No está fusionado, desplegado ni instalado en el iPhone.**

**Hipótesis que siguen abiertas:** (1) carga sostenida del único render WebGL/WKWebView, (2) límite real de FPS ausente en preset alto (test reversible PR #32, sin asumir que mejore si ya va a ~55 fps), (3) fallback accidental a texturas originales en la instalación, (4) otras escenas activas, presentación/composición/sincronización del renderizador. Power Profiler confirmó gasto global alto y `Nominal -> Fair` en TDR, pero no hay desglose por GPU/CPU. No tocar calidad, físicas, Android ni publicación sin evidencia.


## 2026-11-01 noche — PR #35 en Pages DEV, comparación parado / conducción

**Estado correcto de integración:** el PR #35 se fusionó el 01/11 e incorporó al DEV web de GitHub Pages las herramientas de solo diagnóstico originadas en la PR #33 (todavía borrador). Esta sección **actualiza** la nota histórica anterior que indicaba que no estaban desplegadas. El juego de Xcode local NO se actualiza automáticamente con la PWA.

**Prueba 6: coche PARADO, 21:36:59–21:37:21 WET**, medición 21 s, 1.278 frames, 58,3 FPS, frame promedio/pico 17,2/43 ms, >33ms 12/1278 (0,94 %), >50ms 0, P95/P99 27/33 ms. ESCENA CPU 0,4 ms, RENDER CPU 0,1 ms, OTROS 16,6 ms. Audio motor aún `suspended`, 6 fuentes `cargando`. Snapshot: lienzo/GL 956×440, cámaras 2 totales pero solo 1 visible (UI 0), 6 mosaicos fotográficos **COMPACTA** de Karting Américas 930×744, sin originales, 15,8 MiB teóricos RGBA8. Texturas en caché 126 claves, **201,1 MiB teóricos RGBA8**; no es VRAM medida. Una muestra voluntaria WebGL `90/90` completó correctamente en ~1,5 s, **1.080 llamadas JS drawArrays, 12/frame, pico 12**. Esta medición **no incluyó conducción**; el FPS de la muestra instrumentada no debe compararse.

**Prueba 7: CONDUCIENDO, 21:43:00 WET — 21:44:41 WET**, ventana 1m40, 5.491 frames, 54,4 FPS, frame promedio/pico 18,4/105 ms, >33ms 332/5491 (**6,05 %**), >50ms 44/5491 (**0,80 %**), P95/P99 35/48 ms, 41 ráfagas >50ms, máximo 2 consecutivos. ESCENA CPU 0,6 ms, PASO CPU 0,6 ms, RENDER CPU 0,1 ms, OTROS **17,6 ms**. Audio ahora `running` con 6 fuentes. Mismo preset high, resolución 1,5 BASE, fps.limit 0, LOOP RAF, WEBGL DESYNC solicitado (real no disponible), HUD/FOTO/TEXTO PHASER; temperatura táctil **no registrada**. Snapshot puntual después de conducir: GL 956×440, 1 cámara visible, 6 mosaicos **COMPACTA**, 126 texturas y **201,1 MiB teóricos**. No se ejecutó muestra WebGL durante la conducción, así que las **12 draw calls/frame NO** describen la carga GL conduciendo.

**Lectura:** las tasas >33ms pasan de 0,94 % parado a 6,05 % conduciendo (~6,4 veces), y aparecen picos de 105ms; confirma irregularidad en una sesión real. **No es un experimento A/B controlado**: duración distinta, motor no cargado en la primera, estado térmico desconocido y captura puntual vs métricas acumuladas. No atribuir causa a WebGL, GPU, audio, texturas ni calentamiento. El campo OTROS es tiempo de fotograma **no atribuido a las muestras de JS**; no equivale a GPU medida. Cámara UI inactiva y seis mosaicos compactos descartan *en esta captura* duplicación de cámara HUD y fallback a seis fotografías originales. La caché teórica permanece estable entre capturas, lo que no prueba que VRAM total no cambie.

**Discrepancia de identificación que persiste:** el reporte dice `CIRCUITO CIRCUITO ATLÁNTICO`, pero el snapshot de mosaicos es `native:karting-americas:...`. La función diagnóstica elige `scene.track.meta.name` antes de `scene.trackId`. Investigar metadatos sin asumir una pista equivocada ni modificar física/circuito a ciegas.

**Siguiente paso técnico recomendado:** sin nuevas tandas largas si el iPhone se calienta, revisar marcadores de frame pacing/presentación en iOS y experimentar de manera reversible con PR #32 (tope 60 FPS solo iPhone DEV) **si** se realiza una comparación real en estado térmico comparable. `fps.limit=0` no significa 120 FPS efectivos, pues este test mostró 54,4 de promedio. PR #34 (eliminar tareas redundantes) es otra hipótesis aislada y no ha sido validada en hardware. No tocar Android ni publicar apps nativas por estas mediciones.
