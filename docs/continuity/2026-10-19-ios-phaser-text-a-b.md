# iPhone — experimento de texto Phaser por defecto (DEV 1.2.305)

Fecha: 19/10/2026. Solo rama `main`, DEV PWA, no APK ni Play Store.

## Resultados medidos por el propietario

Mismo modo gráfico `high`, resolución 1,5, limitador FPS 0, safe mode NO, cuatro tiles fotográficos:

| Configuración | FPS | Frames > 33,4 ms | Frames > 50 ms | Pico |
| --- | ---: | ---: | ---: | ---: |
| HTML, motor activo | 37,8 | 508/2011 = 25,3 % | 207/2011 = 10,3 % | 131 ms |
| PHASER, motor activo | 45,5 | 227/1375 = 16,5 % | 55/1375 = 4,0 % | 89 ms |
| HTML, motor suspendido | 30,4 | 424/1155 = 36,7 % | 205/1155 = 17,7 % | 161 ms |

Los informes confirman RAF del texto HTML activo con unos 50 nodos; el modo Phaser desactiva dicho RAF. El audio tuvo estado `suspended` y seis fuentes registradas en la tercera prueba, sin mejora. Las mediciones no están normalizadas por temperatura/duración/orden, por lo que no demuestran causalidad exclusiva. Los informes muestran UPDATE CPU 0.0 ms de forma anómala; revisar la instrumentación antes de atribuir toda la CPU a «OTROS».

## Cambio probado en DEV 1.2.305

Commit principal: `3528959d79fe85eae54450711664090b63eb1eb8`.

- `RaceTelemetryHudScene.create`: en carreras normales de iOS DEV activar la ruta existente `setDevRaceTextRenderMode(this,true)` antes de montar MEDIR; excluir replay incrustado. Esta ruta ya bloquea producción y Android.
- El panel de diagnóstico identifica correctamente el modo inicial (`TEXTO PHASER`).
- Al revertir a HTML se vuelven a registrar textos que hayan nacido mientras Phaser estaba activo. Al cerrar carrera se restaura el funcionamiento HTML global como antes.
- Antirregresión `scripts/ios-text-bridge-ab-smoke.mjs`: guarda de replay, ruta nativa reversible, ausencia de RAF en modo Phaser.
- Físicas RALLY 1.0, colisiones, fotos, HUD propio, audio y economía no cambiaron.

Validación GitHub Actions: https://github.com/almaprintes/TopdownCraftrace/actions/runs/39339380904 (build y deploy success).

## Próxima prueba

Abrir PWA DEV en iPhone, arrancar Arafo y otro circuito y confirmar `TEXTOS PHASER · RAF OFF`. Verificar la alineación de textos y la sensación de fluidez, comparando FPS y porcentaje de frames superiores a 50 ms frente al modo HTML activado manualmente con MEDIR. No prometer solución total: Phaser + audio activo todavía mostró 45,5 FPS. No convertir en predeterminado para Play Store sin test visual y rendimientos.
