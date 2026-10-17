# DEV 1.2.262 — iPhone Phaser Text vs puente DOM, A/B/A en carrera

## Contexto
DEV 1.2.261 (main 932dc3b) quitó RAF de DELTA/PAUSA y disminuyó DOM Ghost, pero el propietario comunicó **“No noto cambio”**. Antes, los A/B visuales mostraron mejora fuerte con todas las capas ocultas, pero no se aisló puente HTML del WebGL.

## Una variable de prueba
En `src/game/ui/htmlTextRuntime.js`, se instala en modo normal el puente que intercepta `Phaser.GameObjects.Text.prototype.renderWebGL/renderCanvas`, esconde el render Phaser y mantiene una copia HTML posicionada con un RAF propio aprox. 30 Hz en iOS.

Solo en DEV iOS, durante escena `race`, `getDevRaceTextRenderMode` y `setDevRaceTextRenderMode` permiten cambiar entre:
- **TEXTO HTML** (predeterminado, sin cambios visuales normales): Phaser.Text no se dibuja en Phaser cuando `shouldUseHtml` acepta la escena; RAF puente continúa.
- **TEXTO PHASER**: `shouldUseHtml` devuelve false para race, se ejecutan `originalWebGL/originalCanvas`; se oculta el contenedor DOM del puente y se cancela su propio RAF (sin dejar otro loop). Los textos del HUD DOM independiente, DELTA/PAUSA, velocímetro, controles, minimapa SVG y diagnóstico NO forman parte de `Phaser.GameObjects.Text`; por tanto, siguen visibles.
- Volver a HTML reinicia el RAF de sincronización del puente con la capa visible. Una salida/shutdown/destroy de race también restaura el puente. Android y prod ignoran el A/B por guard explícito.

En `src/game/dev/iosRaceFrameDiagnostics.js` se añade botón TEXTO HTML/PHASER al panel MEDIR y línea reportada `TEXTOS ... · RAF ... · nodos ...`, e identifica modalidad en informes. Pulsar modo reinicia acumulados; plegar MEDIR no detiene muestreo.

## Protocolo A/B/A
Alta, Spark, Karting Tenerife, MOTOR ON, HUD ON, FOTO ON, sin activar otros A/B. Iniciar MEDIR, minimizar y conducir 30 s con TEXTO HTML. Ver y COPIAR. Pulsar TEXTO HTML para cambiar a TEXTO PHASER (puede variar el aspecto de textos heredados), minimizar y repetir 30 s. Volver a TEXTO HTML y medir una tercera vez. Esperar 3–5 s tras cada cambio para evitar transitorios. Comparar FPS sostenidos, >33 ms, >50 ms y picos. No concluir a partir de una sola captura.

No se han tocado circuitos, controles, audio, físicas, WebGL ni Google Play. No prometer mejora sin comprobar en dispositivo. `npm run check:ios-text-bridge-ab` valida defensas de runtime, limpieza y A/B.
