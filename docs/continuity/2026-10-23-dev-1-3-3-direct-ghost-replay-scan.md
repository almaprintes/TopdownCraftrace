# DEV 1.3.3 — Rescate directo de replays locales de Race Control

Fecha: 23/10/2026. Rama única: `main`. Fuente DEV/PWA, **no** nueva versión Android ni Google Play.

## Regresión informada tras 1.3.2

El propietario reporta en dispositivo que modo Fantasma **sigue mostrando «crear una nueva vuelta»** pese a poder reproducir la repetición en Race Control. Por ello **1.3.2 NO está validada funcionalmente**; la conclusión de pruebas verdes fue solo sintética. La versión Android de Google Play sigue 1.2.335/versionCode 10 según captura previa: los cambios DEV 1.3.x no están incluidos en ella.

## Hipótesis adicional encontrada y mejora implementada

`findRaceControlGhost` de 1.3.2 solo consultaba `getCircuitRecord`, cuyos `topLaps[].replayKey` se recalculan a partir de `tdr2:ttHist:`; en un historial truncado, parcial, diferente o con claves de formato anterior se pueden perder los enlaces, **aunque el propio `tdr2:topReplay:<trackId>:...` siga existiendo y sea reproducible**.

- El buscador ahora añade una exploración **solo lectura** de claves `tdr2:topReplay:${encodeURIComponent(trackId)}:` directamente en `localStorage`, sin depender del índice de Race Control.
- Se mantiene validación explícita de `trackKey`, tiempo positivo, cinco o más muestras y `ghostReplayCompatibility` con la geometría cargada; no mezcla normal/inverso ni pista externa.
- Si el índice no se puede reconstruir, **no aborta** sin comprobar la existencia de las claves físicas.
- Test `scripts/ghost-local-pb-recovery-smoke.mjs`: simula índice local `ttHist` vacío mientras existe una repetición válida de Race Control; exige recuperar ese replay automáticamente. Esta prueba habría detectado el hueco de 1.3.2.
- Se conserva el guardado proactivo de PB en `RaceTop10ReplayScene`, la clave `ghostPb` separada y los fantasmas `ghostGeometry` para trazados nuevos. No cambia tiempos PB, anuncios, progreso, cloud, física, circuitos ni clasificación online.

## Protocolo de aceptación necesario

Probar en **la PWA DEV 1.3.3**, no en la app **Google Play 1.2.335**, ya que la app nativa pública no tiene los cambios. No se pueden compartir automáticamente datos locales entre WebView Android de Google Play y Safari/Chrome/PWA: son almacenes independientes. En el **mismo navegador/origen**: abrir Race Control, comprobar que el replay está y se reproduce, regresar a carrera Fantasma del mismo circuito/sentido y comprobar que lo encuentra. Repetir saliendo/entrando sin abrir Race Control, y tras nuevo PB válido.

Si sigue mostrando el mensaje, capturar texto exacto y **diagnosticar si existen los datos en el mismo origen** y resultado de `ghostReplayCompatibility` en el dispositivo, antes de seguir cambiando heurísticas. No desinstalar app, resetear caché/datos ni borrar récords. Ninguna prueba sintética sustituye la comprobación real.
