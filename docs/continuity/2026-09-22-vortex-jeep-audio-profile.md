# HÉLIX Vortex — perfil de audio JEEP

Fecha: 22/09/2026
Versión: DEV 1.1.168

## Decisión

El sonido actual del HÉLIX Vortex queda preservado como perfil reutilizable `ENGINE_AUDIO_PROFILES.JEEP`. El Vortex declara `engineAudioProfile: 'JEEP'` en su ficha y el runtime resuelve los parámetros desde `src/game/audio/EngineAudioProfiles.js`.

Esta extracción no cambia el resultado audible: conserva la misma muestra, el bucle, el pitch inicial, la curva de pitch, las ganancias y los tiempos de suavizado que tenía el Vortex antes de crear el perfil. Sirve como base aprobada para un futuro jeep o todoterreno sin tener que reconstruir el ajuste de oído.

## Fuente y licencia

- Fuente: `buntine/CarEngines`, archivo `sounds/engine.wav`.
- URL de procedencia: `https://raw.githubusercontent.com/buntine/CarEngines/master/sounds/engine.wav`.
- Licencia declarada por el repositorio fuente: CC0 1.0.
- Copia local utilizada en runtime: `public/assets/audio/engine/jeep/engine.wav`.
- SHA-256: `8299d3d595fe4c6b2ed9cf73f7d4ead854e7f97470e59178e8ff9a0b15a41645`.

La copia local elimina la dependencia de GitHub Raw. El sonido aprobado queda fijado por hash y se sirve junto con el resto de recursos del juego.

## Parámetros preservados

| Parámetro | Valor |
| --- | ---: |
| Bucle | Sí |
| Playback rate inicial | 1,10 |
| Ganancia inicial | 0,80 |
| Playback rate mínimo | 0,62 |
| Recorrido de playback rate | 1,28 |
| Suavizado de playback rate | 0,045 s |
| Ganancia base | 0,62 |
| Ganancia por carga | 0,25 |
| Reducción al soltar gas | 0,10 |
| Suavizado de ganancia | 0,055 s |

El perfil sigue pasando por la cadena WebAudio compartida del juego: saturación suave, cuerpo grave, resonancia de habitáculo, filtro de techo y compresor. Esa cadena no se ha modificado en DEV 1.1.168.

## Garantía automática

`scripts/spark-engine-audio-smoke.mjs` fija la asignación del Vortex, todos los valores anteriores y el SHA-256 del WAV local. La prueba falla si se pierde el perfil, cambia alguno de sus parámetros, se altera la muestra o vuelve a aparecer la antigua constante suelta del Vortex.
