# TDR iOS — Comparación Power Profiler con Ultimate Racing 2D 2
Fecha: 2026-11-01 (hora canaria, WET). Análisis técnico de dos registros reales `.atrc` aportados por el usuario. **No se ha modificado ningún código ni publicado una build.**

## Mediciones y método
- Dispositivo: iPhone 16 Pro Max. Instrumento: Apple Power Profiler (iOS 26); consumo **GLOBAL** del sistema en **porcentaje estimado de batería por hora** (%/h). No es porcentaje total gastado ni potencia eléctrica en W, y **no debe atribuirse íntegramente a la aplicación**.
- Ultimate Racing 2D 2: archivo `PowerProfiler_26-11-01_083014_to_26-11-01_083630_001.atrc`. 08:30:14 a 08:36:30, 376 s aproximados, 376 registros de telemetría (375 muestras de consumo no nulas). La aplicación de App Store no estaba seleccionada como proceso monitorizado.
- Top Down RACE: archivo `PowerProfiler_26-11-01_094108_to_26-11-01_094245_001.atrc`. 09:41:08 a 09:42:45, 97 s aproximados, 98 registros (97 muestras de consumo no nulas). Se había activado Top Down RACE en «Monitored apps». El subdesglose de potencia por CPU/GPU/display/red **no pudo extraerse de forma fiable del archivo** sin Apple Instruments.
- Las cifras provienen de valores textuales de signposts incrustados en el fichero binario; las muestras fueron ordenadas por el contador de tiempo de inicio, pues el orden físico de los registros en el fichero NO es cronológico.
- Fuente y método oficial: https://developer.apple.com/documentation/xcode/measuring-your-app-s-power-use-with-power-profiler

## Resultados
| Métrica | Ultimate Racing 2D 2 | Top Down RACE |
|---|---:|---:|
| Duración del registro | ~376 s | ~97 s |
| Consumo global medio, todas las muestras no nulas | 7,97 %/h | 44,08 %/h |
| Consumo global mediano, todas las muestras | 7,43 %/h | 44,50 %/h |
| Consumo global medio, ventana 20 a 90 s de cada archivo (misma posición temporal) | 7,61 %/h | 45,13 %/h |
| Consumo global mediano, ventana 20 a 90 s | 7,70 %/h | 44,99 %/h |
| Razón de consumos globales medios, ventana 20 a 90 s | referencia | **~5,93 veces** |
| Estado térmico interno crudo | código 0 en toda la captura | código 0 inicialmente; cambia a código 10 a ~56,1 s y sigue así |
| Estado de carga | 0 en todas las muestras | 0 en todas las muestras |
| Brillo registrado | 14–16%, normalmente 16% | 11% al principio y **0% desde ~7 s**, sin confirmación visual de brillo real; tomar con cautela |
| Frame Rate en Power Profiler | ~60 predominante | variable, a menudo ~75–105; **tasa de pantalla/sistema, NO FPS medidos de Phaser** |

### Interpretación y límites
1. **Hallazgo principal reproducible en los archivos:** TDR registra una demanda energética global mucho mayor que Ultimate Racing. El contraste permanece comparando las mismas ventanas de 20–90 segundos desde el inicio, aunque las sesiones se hicieron a distinta hora, con distinta duración y configuración de proceso monitorizado.
2. **El dato térmico de TDR cambia de 0 a 10** después de ~56 s. La codificación precisa de esos valores en el signpost de Power Profiler **no está validada**; NO etiquetar «10» como «crítico», «serio» ni como temperatura en grados Celsius sin interpretación oficial de Instruments. La traza de Ultimate permanece en 0.
3. **El brillo declarado no fue equivalente**: TDR muestra 0%, mientras Ultimate muestra ~16%; puede ser configuración real o limitación de lectura, no está corroborado. No afirmar un experimento perfectamente controlado.
4. **No se dispone del desglose por subsistema de la app TDR** aunque se seleccionó en Monitored apps. El número del Power Profiler global NO identifica si la GPU, CPU, pantalla, red u otra parte es la principal fuente.
5. La tasa «Frame Rate» de Power Profiler no es equivalente a los ~50–55 FPS de la medición interna Phaser ni demuestra que TDR estuviera generando 90 FPS reales; son métricas con distinto alcance.
6. La experiencia subjetiva del piloto en Ultimate Racing fue de 5 min fluidos y casi sin calentamiento; TDR da tirones y genera bastante calor en sesiones cortas. Esta observación es coherente con el contraste energético, pero tampoco identifica por sí sola una causa técnica.

## Recomendaciones de ingeniería
- **Prioridad alta: eficiencia gráfica de TDR en iOS.** Auditar ocupación GPU/Metal y coste de presentación/composición de WebGL/WKWebView, tamaño efectivo framebuffer, dibujos innecesarios, utilización del render pass, cámara y carga de fotos. La baja medición de `RENDER CPU` en JS no equivale a tiempo GPU bajo.
- Revisar `src/game/game.js` (Phaser 3/WebGL, `powerPreference:'high-performance'`, `fps.limit:0` iOS high, RAF) y presupuestos específicos iPhone. No asumir que imponer FPS 60 resuelve el problema; RAF se sincroniza normalmente con la pantalla y hay que contrastarlo.
- La app ya incorpora WebP compactos para circuitos iPhone (escala 0,65), por lo que **no reducir arte/definición ni alterar físicas/interfaz a ciegas**.
- Para una segunda comparación más controlada, cuando el iPhone no esté caliente: misma temperatura de partida, brillo realmente idéntico, sin carga, **tanto TDR como Ultimate sin app monitorizada** en Power Profiler para comparación global pareja y misma duración; detener TDR si se recalienta. Aparte, medir TDR con app monitorizada para obtener desglose per-app cuando se pueda abrir Instruments en Mac.
- No cambiar Android, físicas, interfaz, datos de jugadores, producción, ni desplegar sin validación.

## Verificación oficial con Instruments sobre GitHub Actions macOS (2026-11-01, ~10:06 WET)

**Se logró sin acceso al Mac personal**: se subieron los dos .atrc a una rama aislada de **repositorio privado** `almaprintes/TDR-RallyRace`, se procesaron con runner macOS/Xcode 26.6, `xcrun xctrace import` y `xcrun xctrace export`. El analizador y script están en `diagnostics-ios-powerprofiler`. Las trazas originales y la exportación detallada **no** se han añadido a este repo público.

**Confirmaciones del XML exportado por Apple:**
- Ultimate Racing: duración 375.003 s, `SystemThermalState` = **Nominal** durante toda la sesión.
- TDR: duración 96.263 s, `SystemThermalState` = **Nominal durante 55.045 s** y **Fair durante 41.218 s** restantes. Por tanto, el código crudo `10` era **Fair** según Instruments, no Serious ni Critical. Apple define Fair como estado térmico ligeramente elevado; indica tendencia a calentamiento, pero no prueba limitación térmica (throttling). Fuente: https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.enum/fair
- `SystemPowerLevel` exportado: promedio de muestras no nulas **7.9726 %/h** (Ultimate) vs **44.0824 %/h** (TDR). Comparación estricta ventana t=20–90 s (mismo intervalo relativo, pero condiciones distintas): **7.5953 %/h** Ultimate, **44.9191 %/h** TDR, **5.91x**. Estos números difieren ligeramente de la lectura previa hecha sobre cadenas del binario; tomar la exportación XML oficial como referencia.
- **Hallazgo de atribución:** la tabla `ProcessSubsystemPowerImpact` exportó esquema pero **0 filas en las DOS trazas**. `metal-perf-overview-process-metric` sí exportó 325 filas de `Ultimate_Racing_2D_2`, pero **0 filas en TDR**. En el listado de procesos de la traza TDR hay procesos WebKit y SafariViewService, pero **no figura un proceso identificable claramente con el nombre Top Down RACE**. Es compatible con una captura web/PWA o una limitación de instrumentación; **NO asumir** cuál es el caso sin confirmar cómo abrió el usuario TDR.
- **Conclusión**: El contraste energético y elevación térmica de TDR están confirmados por exportación oficial; **no es posible aún atribuir el gasto entre CPU/GPU/pantalla/red de TDR**. También faltan métricas Metal individuales para TDR.
- **Siguiente comprobación**: preguntar si el usuario abrió TDR como app nativa instalada mediante Xcode, como PWA de pantalla de inicio, o en Safari. Si se quiere atribución por proceso, iniciar desde la app monitoreada nativa y volver a medir, sin calentar demasiado el dispositivo.
- No se tocó el motor, Android, físicas, assets, versión DEV/PUBLIC ni monetización; solamente la infraestructura diagnóstica privada y este documento.
