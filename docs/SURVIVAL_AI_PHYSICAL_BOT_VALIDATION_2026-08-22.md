# Validación estructural del bot físico — Fase 3 — 22/08/2026

## Alcance

Primer controlador físico experimental de Supervivencia:

- un solo rival;
- cuerpo Arcade real;
- dirección, gas y freno continuos;
- objetivo anticipado sobre la trazada de Fase 1;
- velocidad objetivo tomada del perfil de Fase 2;
- sin teletransporte durante la marcha;
- sin tráfico, adelantamientos ni colisión con el pelotón;
- activación voluntaria mediante `tdr2:survivalAiMode = planner_v1`;
- el modo predeterminado continúa siendo `legacy`.

Archivos:

- `src/game/ai/survivalPhysicalBotController.js`;
- integración en `RaceSurvivalModeScene.js` y `RaceSurvivalTrafficScene.js`.

## Simulación determinista

Se integraron 60 segundos a 60 Hz por circuito con el mismo controlador y parámetros base. La simulación no sustituye una prueba dentro de Phaser, pero detecta pérdidas de trazada y divergencias antes de publicar el control general.

Calibración aplicada:

- lookahead dependiente de velocidad reducido a 25–82 px;
- envolvente inicial de velocidad: 82 % del máximo del coche patrón;
- reducción progresiva de velocidad cuando aumenta el error angular;
- reducción progresiva de velocidad cuando aumenta la distancia a la trazada;
- ninguna excepción ni parámetro específico por circuito.

| Circuito | Vueltas/60 s | Dist. media línea | Dist. máxima | Semiancho nominal | Estado |
|---|---:|---:|---:|---:|---|
| chicane-vale | 0.96 | 15.5 | 41.7 | 77 | BASE VÁLIDA |
| f1-baku | 1.41 | 15.5 | 35 | 79 | BASE VÁLIDA |
| f1-imola | 1.69 | 13.1 | 35.4 | 79 | BASE VÁLIDA |
| f1-jeddah | 1.42 | 16 | 40.1 | 80 | BASE VÁLIDA |
| f1-melbourne | 1.59 | 15.8 | 36.3 | 80 | BASE VÁLIDA |
| f1-miami | 1.76 | 16.9 | 37.9 | 80 | BASE VÁLIDA |
| f1-monte-carlo | 1.5 | 16 | 36.9 | 76 | BASE VÁLIDA |
| f1-sakhir | 1.2 | 12.2 | 30.5 | 80 | BASE VÁLIDA |
| f1-shanghai | 1.1 | 15.7 | 44.9 | 80 | BASE VÁLIDA |
| forest-endurance | 0.98 | 14.1 | 33.3 | 81 | BASE VÁLIDA |
| karting-canarias | 1.11 | 16.8 | 42 | 85 | BASE VÁLIDA |
| karting-tenerife | 0.89 | 18.7 | 43.1 | 66.6 | BASE VÁLIDA |
| offroad-raven-hollow | 1.58 | 15.8 | 33 | 75 | BASE VÁLIDA |
| santa-cruz | 1.99 | 17.6 | 42.3 | 78 | BASE VÁLIDA |
| switchback-park | 0.75 | 14.9 | 36.5 | 74 | BASE VÁLIDA |
| technical-ridge | 1.17 | 19.9 | 50.4 | 76 | BASE VÁLIDA |
| track01 | 3.04 | 20.6 | 38.1 | 81 | BASE VÁLIDA |

Resultado:

- 17/17 avanzan y completan recorrido;
- 17/17 permanecen dentro del semiancho nominal en esta simulación;
- Jeddah mejora de 95.6 a 40.1 px de desviación máxima;
- Karting Tenerife mejora de 70.6 a 43.1 px;
- Santa Cruz mejora de 61.3 a 42.3 px, con distancia media de 17.6 px;
- el precio de la estabilidad es una reducción provisional de ritmo, pendiente de calibración contra telemetría real.

## Estado de homologación

Fase 3 estructuralmente válida en simulación, pero no homologada todavía dentro de Phaser.

Antes de migrar más bots:

1. probar el bot único dentro de Phaser;
2. verificar que el cuerpo Arcade no sale de bordes reales;
3. confirmar dentro del juego las mejoras simuladas en Jeddah y Karting Tenerife;
4. medir oscilaciones de dirección, distancia a línea, gas/freno y tiempo de vuelta;
5. añadir recuperación segura si el bot pierde la pista;
6. calibrar los parámetros con el coche patrón;
7. mantener los otros cuatro rivales en `legacy`;
8. no activar `planner_v1` como valor predeterminado.

## Activación DEV

Enlace de sesión, sin modificar la preferencia guardada:

```text
https://almaprintes.github.io/TopdownCraftrace/?survivalAi=planner_v1&survivalAiDebug=1
```

Activación persistente desde consola:

```js
localStorage.setItem('tdr2:survivalAiMode', 'planner_v1');
localStorage.setItem('tdr2:survivalAiDebug', '1');
location.reload();
```

Volver al comportamiento publicado:

```js
localStorage.setItem('tdr2:survivalAiMode', 'legacy');
location.reload();
```

La telemetría permanece disponible en `window.__TDR_SURVIVAL_AI__`, incluyendo `steer`, `throttle`, `brake`, `targetSpeed`, `distanceToLine`, `offTrackSeconds` y `recoveryCount`.

## Watchdog de prueba

Solo para el bot experimental:

- acumula tiempo fuera de pista mediante la consulta runtime `_isOnTrack`;
- detecta bloqueo prolongado por debajo de 6 px/s;
- tras 1.25 s fuera de pista o 3 s bloqueado registra `physical_bot_recovery`;
- recupera el cuerpo sobre la muestra válida más cercana;
- no oculta el fallo: motivo, muestra y contador quedan en telemetría;
- no afecta al jugador ni a los bots `legacy`.

La recuperación es una red de seguridad para QA, no una mecánica de conducción ni un criterio de homologación.


## Selector de observación y balance — 22/08/2026

Con `survivalAiDebug=1` aparece un selector táctil:

- `TÚ`;
- `CPU1`;
- `CPU2`;
- `CPU3`;
- `CPU4`;
- `CPU5`.

El selector cambia el objetivo de la cámara y dibuja aro y etiqueta sobre el participante observado. `CPU1` muestra `BOT FÍSICO` cuando `planner_v1` está activo. Al eliminarse el participante observado, la cámara vuelve al jugador.

Discrepancia de balance detectada:

- el histórico se guardaba solo por circuito;
- las vueltas no incluían `carId`;
- Supervivencia podía usar como referencia un tiempo realizado por otro coche;
- las variaciones positivas de ritmo y vuelta podían acumularse hasta borrar el margen del rival más rápido.

Corrección:

- las vueltas nuevas guardan `carId`;
- Supervivencia solo usa históricos demostrablemente realizados con el coche seleccionado;
- los registros antiguos se conservan, pero no equilibran rivales si no identifican el coche;
- multiplicadores de parrilla: 1.30, 1.24, 1.19, 1.14 y 1.10;
- variaciones positivas limitadas a 1.025 por componente;
- el rival más fuerte conserva aproximadamente un 4 % mínimo respecto a la referencia incluso combinando sus picos favorables.

La sensación de dificultad debe volver a validarse con Pulse equipado y después con un coche stock.


## Prueba real: ritmo, amplitud y duelo final

Observación comunicada tras la primera prueba en iPhone:

- CPU1 era claramente más rápido que los cinco rivales legacy;
- su cabeceo era más amplio y lento, percibido como exploración excesiva de los límites;
- los legacy habían quedado demasiado lentos;
- al quedar jugador y CPU1 solos, la sesión continuó tres vueltas sin eliminación.

Causas y correcciones:

- CPU1 ya no usa una envolvente fija independiente: su velocidad física se deriva de `targetRate × longitud de pista`;
- la eficiencia medida del controlador frente al perfil ideal se calibra a 0.82;
- CPU1 se mantiene como rival principal, pero su mejor ritmo teórico conserva margen respecto a la referencia del jugador;
- el fallback sin histórico sube de 36 % a 42 % de la velocidad máxima para evitar legacy excesivamente lentos;
- parrilla ordenada de fuerte a lenta: 1.08, 1.11, 1.15, 1.19 y 1.24;
- CPU1 queda excluido del tráfico legacy para no recibir una segunda corrección lateral;
- en Santa Cruz, el límite dinámico reduce la desviación simulada a 12 px de media y 28 px máxima;
- cada participante expone en la etiqueta `VUELTAS`, cruces de `META` y estado `ARMADO`;
- `_tryCloseSurvivalRound` se evalúa cada frame a partir del estado válido para evitar que una notificación perdida deje bloqueado el duelo.

La siguiente prueba debe anotar qué muestran `V`, `META` y `ARMADO` para TÚ y CPU1 si el duelo vuelve a no finalizar.


## Corrección de interpretación del ritmo de CPU1

Segunda observación del usuario:

- CPU1 ya era fácil de vencer y su velocidad anterior era correcta;
- el problema eran los cuatro rivales legacy, que parecían arrastrarse;
- tras igualar demasiado el ritmo, CPU1 fue eliminado en la segunda vuelta;
- la conducción lateral nueva sí se percibió bastante más natural.

Decisión:

- conservar anticipación, control por error y menor excursión lateral;
- conservar el aumento de ritmo de los legacy;
- aplicar a CPU1 un refuerzo físico de 1.16 sobre el ritmo derivado;
- mantener el límite superior de 82 % del máximo del coche patrón;
- no modificar en esta iteración eliminación, espectador ni reglas de ronda.

El refuerzo aproxima el tiempo teórico de CPU1 al comportamiento anterior sin restaurar la envolvente fija que provocaba mayor exploración de bordes. Pendiente confirmar en dispositivo.


## Anticipación geométrica de chicanes

Observación real:

- legacy parecía cabecear menos que CPU1;
- CPU1 no oscilaba en recta;
- en sucesiones de curvas dibujaba una línea ondulada y lenta de percibir;
- en vez de cruzar la chicane por la diagonal lógica, perseguía vértices consecutivos;
- fue eliminado en la tercera vuelta, sin indicios de velocidad imbatible.

Corrección:

- cada muestra del perfil expone ahora la curvatura local;
- el controlador analiza las próximas 16 muestras;
- solo si detecta cambio significativo de signo y energía angular suficiente marca `chicaneAhead`;
- el lookahead normal permanece en 25–82 px;
- durante la secuencia alterna aumenta progresivamente hasta 70–135 px;
- el coche apunta después de la segunda curva en lugar de tratar la chicane como un eslalon;
- el estado queda registrado en telemetría.

Validación de 60 s sobre la lista completa:

- 17/17 dentro del semiancho nominal;
- cero circuitos estructuralmente fallidos;
- Santa Cruz: 19.5 cambios de signo de volante por vuelta, 15.3 px de desviación media y 35 px máxima sobre 78 px;
- el cambio mantiene el ritmo de CPU1;
- pendiente confirmar visualmente que la diagonal se percibe natural en las chicanes concretas observadas.


## Ajuste de apertura y ritmo tras prueba visual

Observación real posterior:

- CPU1 necesitaba un aumento pequeño de ritmo;
- se abría demasiado en prácticamente todas las curvas;
- la corrección debía conservar una trazada lógica exterior–vértice–salida, sin devolverlo a un carril central imaginario.

Corrección general, sin excepciones por circuito:

- el optimizador admite `offsetScale` para graduar la excursión de su trazada ya calculada;
- Supervivencia usa `offsetScale = 0.72`, por lo que conserva la forma de la línea rápida con un 28 % menos de desplazamiento lateral;
- el refuerzo físico de CPU1 sube de 1.16 a 1.21;
- se mantienen la anticipación de chicanes, el control continuo y el límite físico existente.

Validación determinista de 60 s:

- 17/17 circuitos permanecen dentro de su semiancho nominal;
- Santa Cruz pasa de 1.90 a 1.98 vueltas/60 s, aproximadamente un 4.2 % más rápido;
- la excursión máxima intencionada de la trazada de Santa Cruz baja de 16.8 a 12.1 px;
- seguimiento físico en Santa Cruz: 16.0 px de desviación media y 38.0 px máxima sobre 78 px de semiancho;
- la mayor excursión planificada entre los 17 circuitos es 15.3 px.

Pendiente comprobar en dispositivo que CPU1 deja de abrirse en exceso sin perder naturalidad ni recortar bordes de forma irreal.


## Refinamiento guiado por grabación real

Se revisó una grabación completa de 94.7 s siguiendo a CPU1 en Santa Cruz. La prueba confirmó:

- estabilidad razonable en recta;
- correcciones laterales lentas y amplias en curvas enlazadas;
- apertura excesiva durante buena parte de algunas curvas;
- horquilla recorrida con radio demasiado exterior;
- chicanes dibujadas como una S completa;
- velocidad visible habitualmente entre 40 y 55 km/h, insuficiente respecto a la referencia mostrada de 17.37 s.

Primer intento descartado:

- se probó fijar un objetivo posterior a la segunda curva durante toda la maniobra;
- la detección resultó demasiado permisiva y Santa Cruz quedó marcada como chicane casi toda la vuelta;
- solo 15/17 circuitos permanecieron dentro del corredor;
- esa calibración se sustituyó y no representa el estado final.

Corrección conservada:

- una chicane exige exactamente un cambio de signo y energía suficiente en ambos sentidos;
- en curva cerrada el horizonte disminuye para atacar mejor el vértice;
- en chicane confirmada aumenta de forma acotada para buscar la diagonal;
- el volante recibe un límite de variación, manteniendo respuesta suficiente;
- el factor físico sube de 1.21 a 1.27 y el techo del bot de 82 % a 86 % del máximo del coche patrón;
- no se modifica la física común ni la velocidad máxima del jugador.

Validación final de 60 s:

- 17/17 circuitos dentro del corredor;
- Santa Cruz: 1.84 vueltas, 33.0 px de desviación máxima respecto a la línea y 35.5 px respecto a la referencia central sobre 78 px de semiancho;
- Santa Cruz: 22.9 cambios de signo de volante por vuelta;
- detección de chicane activa durante el 9.2 % de la simulación de Santa Cruz;
- Shanghai conserva el margen estructural menor: 9.5 px, por lo que sigue requiriendo revisión visual.

La simulación valida estructura y estabilidad numérica; la naturalidad y el ritmo definitivo deben confirmarse en dispositivo con otra grabación.
