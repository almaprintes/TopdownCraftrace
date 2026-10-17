# DEV 1.2.259 — audio del motor: suspensión real A/B/A y estado safe mode

## Motivo / hechos
Auditoría independiente de DEV 1.2.258 (`47592285`) encontró:
- El sonido universal de seis samples llegó a todos los coches DEV en los commits `331fab50` y `51174904` del 16/10; WebAudio mezcla seis fuentes en loop, compresor y WaveShaper. Su DSP no figura en UPDATE CPU.
- `liveDeltaToggle.js` mantiene RAF y MutationObserver globales y los POST_UPDATE DOM Ghost/minimap quedan fuera de UPDATE CPU: otros sospechosos, **sin atribución causal**.
- Una clave `tdr2:autoIosSafeModeUntil` puede activar modo seguro por seis horas; `tdr2:forceIosSafeMode` activa manual. Puede ejecutar Phaser en modo temporizador y objetivo 30 incluso en Alta.
- El propietario confirmó tirones tanto Ultra como Alta, con HUD y foto ocultos. No se demostró causa.

## Nueva prueba
`CarEngineSampleRuntime` añade `setDevEngineAudioSuspended(disabled)` solo DEV, que usa su flujo de `_focusTransition` para realizar `AudioContext.suspend()` real (y bloquear los caminos automáticos de `resume()` mediante `_audioBlocked`). El modo MOTOR OFF no es silenciar volumen sino parar procesamiento WebAudio del motor y la actualización de parámetros. MOTOR ON realiza `resume()` y refresca el audio. En inicio y fuera de DEV se conserva el funcionamiento existente. El apagado normal de la escena sigue cerrando el contexto. No se altera ignición, física, controles, fotos ni audio de otros subsistemas.

`iosRaceFrameDiagnostics.js` incluye botón MOTOR ON / OFF, estado WebAudio observado (running/suspended), cantidad de fuentes y modo (rpm-bank), con estado explícito de safe mode manual o automático y su expiración. Reinicia contadores cuando un toggle se completa y acumula a lo largo de la ventana, mostrando el resultado actualizado aproximadamente cada 1.5 s. Un rechazo/bloqueo del navegador se rotula PRUEBA NO VÁLIDA, sin atribuir el resultado.

## Pasos de diagnóstico
1. Alta, mismo coche y Karting Tenerife, HUD ON, FOTO ON; arranca y conduce normalmente. MEDIR, MOTOR ON, observar 20–30 s, copiar reporte.
2. Pulsar MOTOR ON para pasarlo a MOTOR OFF, esperar confirmación 'CONTEXTO suspended'; conducir 20–30 s, copiar reporte.
3. Pulsar MOTOR OFF para MOTOR ON, esperar 'CONTEXTO running'; conducir 20–30 s, copiar reporte.
4. Registrar si SAFE SI con TIMER SI, modo WebGL real y la mejora/reversión A/B/A. **No desactivar automáticamente safe mode**; protege tras fallos.

Comparar >33ms, >50ms, FPS y peor FRAME bajo condiciones similares. Si MOTOR OFF mejora y MOTOR ON empeora, perfilar DSP y buscar solución con calidad audible; si no cambia, concentrarse en procesos DOM fuera de update. WebGL SYNC/DESYNC de 1.2.258 permanece con la preferencia seleccionada.

## Restricciones
main único, DEV 1.2.259, CI Build+Deploy verde para declarar listo. Sin Play Android, sin nuevas fotos ni cambios de física. Los FPS en iPhone requieren validación del propietario.
