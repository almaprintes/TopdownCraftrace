# HÉLIX Spark — auditoría y reconstrucción del audio de motor

> Nota de continuidad: el evento común de ignición CC0 añadido en DEV 1.1.173 se
> documenta en `2026-09-23-real-ignition-audio.md`. Es un sample de arranque previo
> al motor del coche y no sustituye ni modifica este banco RPM del Spark.

Fecha: 22/09/2026
Versión: DEV 1.1.166

## Diagnóstico

DEV 1.1.165 reproducía Spark con seis `HTMLAudioElement` independientes cargados desde `raw.githubusercontent.com`. Cada elemento tenía su propio reloj, buffer, instante de inicio y decodificador. El runtime cambiaba `volume` directamente cada 45 ms y aplicaba el mismo `playbackRate` global a todas las capas. En Safari esto produjo capas desincronizadas y cortes; en Android añadió una dependencia de red y seis inicios multimedia simultáneos. La ruta WebAudio que existía en el mismo archivo nunca se utilizaba para Spark porque `startEngine()` retornaba antes de construirla.

Había además una contradicción funcional: la interfaz mostraba «puedes acelerar» antes de la salida, pero la rama multimedia fijaba el objetivo a ralentí mientras `_raceStarted` fuese falso. Por tanto, acelerar parado durante la secuencia de salida no podía elevar las RPM.

## Auditoría de las muestras

Las seis descargas remotas se compararon con los archivos originales de OpenGameArt y son idénticas byte a byte. Todas son RIFF/WAVE PCM mono de 16 bits a 44.1 kHz. No tienen silencio inicial. Sus saltos de amplitud en el seam están entre 0.00415 y 0.01645 a escala completa: no son perfectos, pero son suficientemente pequeños para loop y quedan amortiguados por las ganancias suavizadas.

| Archivo | Duración | Tamaño |
| --- | ---: | ---: |
| `loop_0.wav` | 0.864082 s | 76,332 B |
| `loop_1_0.wav` | 0.666667 s | 58,920 B |
| `loop_2_0.wav` | 0.682562 s | 60,322 B |
| `loop_3_0.wav` | 0.616032 s | 54,454 B |
| `loop_4_0.wav` | 0.630839 s | 55,760 B |
| `loop_5_0.wav` | 0.629569 s | 55,648 B |

Fuente original: [OpenGameArt — Racing Car Engine Sound Loops](https://opengameart.org/content/racing-car-engine-sound-loops), autor `domasx2`, licencia CC0. El autor confirma que la diferencia entre archivos es el pitch y que la versión publicada fue rehecha desde una muestra de dominio público. Los hashes completos están en `public/assets/audio/engine/spark/README.md`.

## Arquitectura vigente

1. Al crear la carrera con Spark se crea un `AudioContext` silencioso y comienza la lectura/decodificación de los seis assets locales.
2. `ARRANCAR MOTOR` reanuda ese contexto dentro del gesto autorizado por Safari/Chrome y reproduce el arranque.
3. Se crean seis `AudioBufferSourceNode` en loop con el mismo instante de inicio y un `GainNode` por capa.
4. El modelo puro `SparkEngineModel.js` calcula RPM objetivo desde la velocidad real y el gas real, suaviza subida/caída y selecciona únicamente dos capas adyacentes.
5. Las dos capas usan crossfade de potencia constante y una corrección de pitch moderada para encontrarse durante la transición.
6. Las capas pasan por bus de motor, saturación ligera, cuerpo grave, filtro de cabina, techo, master y compresor.
7. Al ocultar/mostrar la página se intenta reanudar un contexto suspendido. Al entrar en resultados o abandonar la escena se detienen fuentes, se eliminan listeners y se cierra el contexto.

No existe fallback procedural para Spark. Vortex conserva su muestra y el resto de coches conserva el motor procedural anterior.

## Señales de juego utilizadas

- Velocidad: `scene.carBody.body.velocity`, la misma física Arcade que mueve el coche y alimenta el HUD.
- Gas táctil/mando: `scene.touch.throttle`.
- Gas de teclado: `scene.keys.up` / `scene.keys.up2`.

El runtime de audio solo lee estas señales. No modifica `touch`, `accel`, `brakeForce`, velocidad ni estado físico.

## Validación automatizada

`npm run check:spark-engine-audio` verifica:

- ralentí estable sin gas ni velocidad;
- subida de vueltas con gas estando parado;
- arrastre de RPM por velocidad;
- caída al levantar gas;
- crossfade limitado a dos capas y potencia constante;
- presencia/formato RIFF de los seis assets;
- ausencia de GitHub Raw y `HTMLAudioElement` en la ruta de Spark.

## Prueba manual requerida

### iPhone/iPad Safari

1. Seleccionar HÉLIX Spark y entrar en carrera.
2. Pulsar una sola vez `ARRANCAR MOTOR`: debe oírse arranque y después ralentí continuo.
3. Acelerar durante las luces con el coche inmóvil: el tono debe subir y caer al soltar.
4. Completar una vuelta alternando gas y retención; comprobar continuidad, cambios claros de régimen y ausencia de cortes/clicks.
5. Enviar Safari a segundo plano y volver; el motor debe reanudarse.
6. Terminar o abandonar la carrera; el motor debe quedar completamente detenido.

### Android Chrome/WebView

Repetir la misma secuencia, añadir una carrera con otro coche para confirmar su motor procedural y vigilar que FPS, pedales y dirección no cambien. En consola, Spark debe registrar precarga local, seis duraciones decodificadas y el inicio del grafo sobre un único reloj; no debe solicitar `raw.githubusercontent.com/yashimosh`.
