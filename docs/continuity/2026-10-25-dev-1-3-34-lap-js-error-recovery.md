# DEV 1.3.34 — Error JavaScript al cruzar meta · Karting Américas

25/10/2026 · rama main · solo DEV.

## Evidencia y corrección de contexto
En captura del iPhone, sobre Karting Américas, aparece `DIAGNÓSTICO · ERROR JAVASCRIPT · escena race` justo al cruzar meta. El jugador aclaró que había superado y publicado su récord personal **antes de empezar a conducir**. En esta vuelta **NO** estaba estableciendo nuevo PB. No confundir publicación online anterior con el cierre de vuelta ni culpar al ranking sin evidencia.

El aviso original proviene de `src/game/dev/runtimeCrashDiagnostics.js`: escucha `window.error`, guarda `tdr2:runtimeLastEvent`, `tdr2:runtimeFlightRecorder` con mensaje, fuente y línea. La captura no mostraba el mensaje. Una recarga podía sobrescribir último evento con `unexpected_reload`, aunque el flight recorder guarda errores anteriores. No disponemos todavía de la excepción exacta desde el iPhone.

## Mitigación comprobable
`RaceWideCameraPreviewScene.update` activaba secuencialmente operaciones opcionales tras completar cualquier vuelta, mejorara o no: guardado de récord por coche, animación de récord, `grantRaceLoot` y animación de botín. Un `QuotaExceededError` o error en cualquiera de estos pasos podía escapar al game loop. `src/game/scenes/raceLapCompletionEffects.js` envuelve las fases individualmente, registra su error (fase, circuito, coche, tiempo, mensaje y stack) en `tdr2:raceLastLapError`, y continúa los pasos independientes. **No inventar recompensas ni declarar premio guardado cuando persistencia falló**. La vuelta ya validada por la clase base sigue registrada con el sistema original. No alterar meta, CP, récords online, cámara, geometría ni economía de recompensas.

`runtimeCrashDiagnostics.js` guarda además `tdr2:runtimeLastJsError` ante error real o promesa rechazada y muestra hasta 160 caracteres de mensaje en el aviso (en vez de solo `ERROR JAVASCRIPT`).

## Extracción del error original
`Admin Hub → ÚLTIMO ERROR` abre un reporte local seleccionable y copiable, montado en overlay DOM; extrae `runtimeLastEvent`, error anclado, los eventos de error del flight recorder y `raceLastLapError`. Funciona aun si error anterior fue reetiquetado `unexpected_reload`. No transmite nada al servidor ni requiere cuenta. El usuario debe copiar el informe de su iPhone en el chat para conocer la causa original antes de aplicar otra corrección.

Prueba `npm run check:race-lap-error-recovery`: error al guardar récord, concesión de botín o presentación no bloquea la vuelta, registra la fase, no duplica premio y recupera error JavaScript anterior del historial. Se ejecuta en prebuild.

Sin publicación Play ni APK/AAB.
