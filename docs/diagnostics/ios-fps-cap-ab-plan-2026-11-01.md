# TDR iOS — prueba aislada FPS 0 vs FPS 60 (sin cambio visual)
Fecha: 2026-11-01.
Estado: **integrada manualmente sobre main para la DEV PWA en GitHub Pages**, con pruebas automatizadas; no modifica ni instala la aplicación iOS nativa de Xcode. El PR #32 permanece como borrador histórico. La publicación efectiva requiere verificar Build+Deploy del SHA final.

## Motivo
El Power Profiler global del iPhone durante la sesión TDR registró ~44,08% de batería/h y estado térmico de Apple Instruments `Nominal` -> `Fair` a ~55 s; Ultimate Racing 2D 2 registró ~7,97%/h, estado `Nominal` toda la sesión. La comparación tiene confusores: duración, brillo mostrado, app monitorizada, distinta plataforma y diferencias en horas; **no demuestra la causa**.

En `src/game/game.js`, el preset alto en iPhone sin perfil de pantalla compacta calcula `fps.limit = 0`. Documentación Phaser 3.90: `fps.target` es aspiracional, `fps.limit` aplica un máximo; 0 significa sin tope explícito. **Esto no significa que se ejecute sin sincronización de pantalla**, porque RAF se coordina con la frecuencia de refresco del navegador. Un cap de 60 podría reducir picos de trabajo en paneles de hasta 120 Hz, o podría no dar ningún beneficio.

## Implementación experimental
- `src/game/performance/iosDevFpsCapTrial.js`: si y solo si iPhone + build DEV + sin SafeMode + sin cap menor o igual a 60 + almacenamiento `tdr2:devIosFpsCap60:v1` con valor `1`, aplicar `fps.limit:60`; si no, valores originales. Cualquier otro sistema y producción permanecen intactos.
- `src/game/game.js`: configura Phaser FPS del modo A/B **solo** al construir el Game, conserva el valor base en los diagnósticos.
- `src/game/dev/iosRaceFrameDiagnostics.js`: nuevo control **PROBAR FPS 60 (REINICIA)** / **VOLVER FPS BASE (REINICIA)** en el panel diagnóstico iPhone ya existente. Cambiar la opción recarga la aplicación; los otros ajustes se conservan.
- Prueba `node scripts/ios-dev-fps-cap-smoke.mjs`; CI exclusivo de la rama (no despliega).
- No cambia física ni lógica, geometría, escenarios, arte, control táctil, contenido WebP, Android, producción ni nivel visual. El cap sí puede modificar la frecuencia efectiva de actualización de física: comparar sensaciones y tiempos de conducción, y restaurar si perjudica.

## Protocolo antes de decidir
1. **Comprobar que la app monitorizada por Power Profiler es la misma build que se va a evaluar**: el cliente iOS instalado por Xcode puede ser anterior al HEAD de GitHub. La PWA Safari y la app nativa Capacitor WKWebView NO son idénticas: no comparar potencia de una contra la otra como si fueran un mismo binario.
2. Cuando sea posible instalar/sincronizar una versión DEV actual en el iPhone, confirmar FPS limit en el diagnóstico, calidad `high`, RES 1.5 (si es base), WEBGL y LOOP iguales, MOTOR igual y mismo circuito/coche.
3. Con Power Profiler, grabar una sesión **BASE (0)** corta (60–90s), al empezar templado, sin cargador, brillo manual idéntico (verificar en UI; cifra 0% en una traza anterior es dudosa). Guardar `.atrc`. Detener si sube mucho el calor.
4. Dejar enfriar hasta situación comparable; activar **PROBAR FPS 60 (REINICIA)**; repetir mismo recorrido/tiempo, registrar segunda traza `.atrc`. Los ajustes fuera del límite deben permanecer iguales.
5. Comparar consumo global de ventanas equivalentes, estados térmicos por tabla nativa Instruments, intervalo p95/p99 y >33/>50 de diagnóstico Phaser, y efecto visual perceptible.
6. Si se aproxima la fluidez de Ultimate o baja consumo sin perjudicar dirección y tiempos, considerar un **ajuste iOS específico** validado; si no, revertir en el botón FPS BASE y continuar auditoría de composición GPU/WKWebView.
7. No promocionar a producción ni alterar Android sin evidencia.

### Restricciones actuales
El usuario comunicó no tener acceso al iMac durante esta etapa. La rama es **preparación**, no puede convertir ni actualizar a distancia la instalación nativa que ya existe en su iPhone. GitHub Actions macOS ayuda a analizar registros, pero no puede reemplazar por sí solo una app instalada sin firma/provisión y un canal de instalación.

## Integración sobre main, posterior a PR #35
- Solo se traslada el módulo opt-in y el botón de PR #32, preservando las herramientas de cámara y contador WebGL ya integradas por PR #35.
- El informe añade `FPS BASE 0` o `FPS PRUEBA 60`; tras pulsar el botón la página se reinicia. La prueba requiere volver a entrar a carrera y pulsar MEDIR; no afecta el dispositivo si no activas el botón.
- Los tests se ejecutan en prebuild tanto de DEV como en el preflight de distribución: resguardan Android, iPad y `tdr-prod`.
- No se han fusionado ramas antiguas completas, alterado Gradle, publicado AAB/IPA ni cambiado el código de rendimiento Android.
