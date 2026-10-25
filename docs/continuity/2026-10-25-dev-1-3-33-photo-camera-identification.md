# DEV 1.3.33 — Corrección del zoom fotográfico

Fecha: 25/10/2026. Rama main.

Se comprobó que el ajuste de zoom de DEV 1.3.32 no se ejecutaba en los circuitos fotográficos. El runtime establece this.track.meta=t01, y el campo de fotografía está en t01.meta.renderMode; por ello el predicado anterior this.track.meta.renderMode==='image-native' devolvía siempre false.

Se sustituyeron ambas comprobaciones (cámara inicial y zoom dinámico) por isImageNativeTrackScene(this), helper común que ya verifica los metadatos anidados y la identidad del circuito.

En DEV, foto-nativos: zoom automático max 0.86, mínimo anterior 0.62. En producción y pistas no fotográficas, cámara inalterada. RaceWideCameraPreviewScene establece el máximo habitual 1.06 aunque RaceScene base conserva una configuración nominal de 1.50; el zoom manual con teclado u otros modos de vista puede actuar por separado.

El HUD DEV lee zoom real de cameras.main.zoom. La prueba scripts/photo-camera-framing-smoke.mjs simula la estructura de metadatos anidados para evitar el falso positivo de DEV 1.3.32.

No tocar carrocerías, colisiones, trazados, físicas, foto/tiles, rankings, memoria, ni publicar Android. Verificar visualmente y con HUD antes de alterar las texturas.
