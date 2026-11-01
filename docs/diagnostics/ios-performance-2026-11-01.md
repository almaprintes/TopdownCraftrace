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

### Próximo experimento recomendado
Primero confirmar cómo terminó de temperatura el iPhone en la prueba 4. Si está fresco o templado, una única prueba **sin pausa y sin alterar ajustes** que dure ~2 min, en Karting Américas/HÉLIX Spark, con MEDIR activo, anotando sensación térmica antes/después; detener si aparece calor excesivo. Comparar **tasas**, P95/P99 y ráfagas con la prueba 4 para ver si empeoran con mayor duración. Opcionalmente hacer mediciones por ventanas temporales reiniciando SOLO el contador del diagnóstico, si se puede hacer sin pausar/ocultar la app, pero eso añade intervención y dificulta comparabilidad. **No introducir cambios de código o más A/B hasta aislar temperatura/tiempo y pausa.**

## Último estado del usuario
- El dispositivo se enfrió una vez, pero en la prueba C volvió a calentarse.
- El usuario reanudó las pruebas a la mañana siguiente (2026-11-01), con la prueba 4 documentada arriba; pendiente conocer el calor final e investigar un tramo sostenido controlado.
- No se ha probado todavía un límite iOS real de 60 FPS ni el modo LOOP TIMEOUT con condiciones controladas.
- Ningún informe presentado prueba que la pausa o WebGL sea la causa definitiva.

---
*Este documento conserva el estado de investigación sin adelantar conclusiones ni modificar el juego. No contiene datos privados del jugador.*
