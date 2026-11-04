# TDR iOS — revisión de trabajo redundante por fotograma (2026-11-01)

## Estado
Experimento de código **aislado en `diagnostics/ios-photo-framework-reduction-2026-11-01`**, sin fusionar ni desplegar. No modifica arte, presentación visible, físicas, controles, checkpoints, Android ni producción. **No se ha validado en dispositivo físico.**

## Antecedentes medidos
- En iPhone 16 Pro Max Power Profiler + Instruments midió consumo global medio ~44,08 %/h en TDR frente ~7,97 %/h en Ultimate Racing 2D 2; en TDR cambio `Nominal -> Fair` ~55s. Las sesiones no son idénticas; no confundir estimación global con consumo del proceso.
- Pruebas anteriores de TDR a res 1.0 y audio de motor desactivado no resolvieron los tirones/calor.
- Las hipótesis FPS 60 y cámara/atlas se investigan por separado en los PR #32 y #33. No mezclar todas las variables durante la primera medición.

## Cambios incluidos aquí
### 1. No-op foto/materiales
- `src/game/scenes/RaceRealSurfaceAssetsScene.js`: `update()` llama siempre a `_applyAtlanticoSurfacePresentation()`. Esta función hace `currentTrackKey(this)` con acceso a `localStorage` en cada frame, incluso en circuitos fotográficos. Si hay `_beautyLayerActive`, sobre Atlántico la propia función ya salía sin dibujar nada, y para los demás circuitos también retornaba por no coincidir el identificador.
- Solo en **DEV iPhone con `_beautyLayerActive===true`**, se evita esa llamada al actualizar. La detección del dispositivo se resuelve **una sola vez durante `create`**, sin nuevo `userAgent` ni objeto de parámetros por frame.
- En producción y Android el código original permanece exactamente en la llamada de actualización; si no hay beauty layer activa, también.
- Esto reduce consultas a `localStorage` por fotograma en ese escenario; **desconocemos su coste energético real**.

### 2. Evitar doble recorrido de objetos con mando
- `src/game/scenes/RaceEmbeddedReplaySceneV2.js`: si iPhone DEV y carrera no embebida, evita llamar a `_tdrHideResidualPhaserSteering()` inmediatamente antes de `super.update` porque se vuelve a llamar **después** de `super.update` y antes del render. Preserva el recorrido final (cuando realmente procede ocultar objetos sobrantes).
- `_tdrSyncGamepadUi` sigue ejecutándose y los eventos `gamepadconnected`, `gamepaddisconnected`, `focus`, `pageshow` permanecen iguales.
- La comprobación de omisión se calcula **una vez en `create`**. Modo replay embebido, Android, iPad, producción y otros sistemas siguen con el camino previo.
- No elimina el bucle de consulta de mando ni elimina trabajo relevante cuando no se ha seleccionado mando: en ese caso el recorrido ya devolvía rápidamente. **No atribuir el consumo de TDR a esta rutina por sí sola**.

## Verificación
- `scripts/ios-dev-redundant-render-guard-smoke.mjs`: pruebas de aislamiento iPhone/Android/producción/replay, y aserciones sobre preservación de escaneado final y lectura única por carrera.
- `.github/workflows/ios-dev-redundant-pass-smoke.yml`: CI exclusiva rama, sintaxis JS y test. No despliega PWA, Android, iOS ni modifica Supabase.

## Próxima validación
- Preparar build DEV nativa en iPhone desde una copia local sincronizada (no asumir que GitHub CI actualiza apps instaladas).
- Probar primero sin cambios, luego **solo este PR**, por 60–90 s cada vez que el teléfono esté templado, con Power Profiler y misma calidad/brillo/circuito/coche. Detener ante calor excesivo.
- En iOS con mando real, verificar que desaparece el control táctil residual y se restauran los elementos de UI tras reanudar desde pausa. Si hay regresión visible, descartar este PR.
- Si el beneficio energético es negligible, priorizar instrumentación nativa GPU/Metal e identificación de doble render. No reducir arte ni sacrificar dirección.
