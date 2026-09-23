# Arranque real de motor — DEV 1.1.173

Todas las carreras normales que pasan por `RaceEmbeddedReplaySceneV2` reproducen un
evento de ignición local al pulsar `◉ ARRANCAR MOTOR`. El botón queda bloqueado en
el primer toque, el WAV comienza mediante el mismo `AudioContext` y los mismos
niveles `master`/`engine` del runtime, el motor propio del coche entra con un
crossfade corto y el semáforo comienza a los 930 ms. Los replays embebidos no
instalan este flujo y el runtime detiene/desconecta el sample al abandonar la
carrera. Un fallo de carga o decodificación del WAV no retrasa el semáforo.

El cambio no altera física, RPM, aceleración ni los perfiles de sonido existentes:
Spark y Gripline conservan sus bancos RPM; Vortex conserva `JEEP`; los demás coches
siguen usando su perfil anterior.

## Procedencia y licencia

- Obra: `Car engine start 01`
- Archivo original: `generic_car_startengine_1.wav`
- Autor: looneybits
- Fuente: https://opengameart.org/content/car-engine-start-01
- Licencia indicada por la fuente: CC0 / dominio público
- Copia local: `public/assets/audio/engine/ignition/car_engine_start.wav`
- SHA-256: `1f50e855d5924221017093117407274ec1c929e83ec0f1940b1d6cdd941fc8ff`
- Formato/duración auditados: PCM WAV, estéreo, 44.1 kHz, 16 bit, 1.005 s

La aplicación nunca reproduce este recurso desde una URL externa.
