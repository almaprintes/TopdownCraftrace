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


## Segunda grabación: chicane corta y ritmo

La grabación de 88.9 s confirma menor excursión exterior, pero muestra que las chicanes cortas aún no se diagonalizaban y CPU1 continuaba lento, normalmente en el entorno visible de 50–59 km/h.

Corrección:

- detector adicional de dos lóbulos contiguos, opuestos y equilibrados para chicanes cortas;
- no se relaja el detector general de secuencias largas;
- factor físico de 1.27 a 1.38;
- techo experimental de 86 % a 92 % del máximo del coche patrón.

Validación:

- 17/17 circuitos dentro del corredor;
- Santa Cruz: 2.00 vueltas/60 s, 39.1 px máximos respecto a la referencia central sobre 78 px;
- 20.0 cambios de signo de volante por vuelta;
- detección de chicane activa el 24.2 % de la simulación de Santa Cruz;
- Shanghai queda con solo 0.9 px de margen estructural;
- se descartó el techo del 95 % porque Shanghai excedía el corredor en 1.2 px.

Pendiente confirmar en dispositivo que las dos chicanes cortas se leen como diagonales y que el aumento de ritmo es suficiente.


## Tercera grabación: consistencia y uso de piano

Observación del usuario:

- CPU1 empieza fuerte, pero parece perder rendimiento al sucederse las vueltas;
- la menor excursión exterior es una mejora;
- todavía no diagonaliza las chicanes;
- se aprueba que un vértice pueda exceder el límite uno o dos píxeles durante un instante si representa una comida de piano lógica;
- no se aprueban salidas prolongadas ni excursiones fuera de pista.

Comprobación:

- no existe multiplicador de fatiga ni reducción de `targetRate` por vuelta para CPU1;
- la simulación de Santa Cruz mantiene 29.23 s y 29.10 s en dos vueltas consecutivas;
- la variación observada procede de curvas, error de seguimiento y reducción correctiva de velocidad, no de una degradación programada.

Corrección:

- una chicane corta detectada fija un único objetivo de salida durante doce muestras;
- el objetivo no se recalcula al llegar al segundo vértice, evitando reconstruir la S;
- factor físico 1.45 y techo 95 %;
- la telemetría distingue `shortChicane`.

Criterio revisado de límites:

- se acepta hasta 3 px fuera durante un máximo de 0.40 s como uso breve de piano;
- cualquier exceso superior o permanencia mayor continúa siendo fallo;
- con este criterio, 17/17 circuitos son válidos;
- Shanghai presenta el máximo: 1.5 px durante 0.30 s;
- Santa Cruz no excede el borde en la simulación y marca 29.23/29.10 s.

Pendiente validación visual de la diagonal y confirmar que el ritmo percibido se mantiene durante toda la sesión real.


## Cuarta grabación: riesgo humano en curva

La grabación de 129.7 s confirma que CPU1 puede completar la sesión, pero el jugador lo vence a medio gas. La causa visible ya no es la recta: CPU1 asegura cada curva, reduce normalmente a 40–50 km/h y no intenta conservar velocidad para arañar tiempo.

Se añade un presupuesto de riesgo condicionado:

- el extra aumenta cuanto menor es la velocidad base de la curva;
- solo se concede si el coche llega con poco error angular y cerca de su trayectoria;
- la confianza disminuye continuamente al descolocarse;
- si llega mal, renuncia al extra antes de convertir el riesgo en una salida;
- no añade errores aleatorios ni aumenta la velocidad punta;
- telemetría: `cornerRisk`, `riskConfidence` y `riskScale`.

Calibración:

- riesgo máximo de CPU1: 0.35;
- una variante sin control de confianza se descartó: Shanghai alcanzaba 13 px fuera durante casi un segundo;
- con confianza, 17/17 circuitos cumplen el criterio de 3 px/0.40 s;
- Santa Cruz mejora de aproximadamente 29.2 a 27.45/27.38 s en vueltas consecutivas;
- Shanghai permanece dentro en la simulación final.

Pendiente confirmar en iPhone que la mayor velocidad de paso se percibe como decisión y que CPU1 sigue recuperándose de una entrada mala sin excursiones.


## Referencia humana de Santa Cruz — 17.301 s

Se analizó una vuelta completa de AVENIR Gripline conducida por el usuario.

Patrones observados:

- velocidad habitualmente entre 58 y 61 km/h;
- mínima aproximada de 53–55 km/h incluso en la horquilla;
- las enlazadas se resuelven como una sola intención;
- no hay recentralización automática después de cada vértice;
- se sacrifica una curva cuando mejora la salida de la siguiente;
- uso breve de piano y pocas correcciones largas y decididas.

Nueva capa experimental:

- `src/game/ai/trackManeuverPlanner.js`;
- suaviza la curvatura antes de clasificarla;
- agrupa únicamente pares próximos, opuestos y equilibrados;
- genera identidad, entrada, fase, riesgo y salida común;
- el controlador mantiene el objetivo hasta completar el sector;
- durante la maniobra no penaliza como error una separación moderada de la línea;
- toda la secuencia comparte una velocidad al 65 % entre el mínimo y el máximo local, evitando frenar de nuevo por cada vértice.

Validación:

- 17/17 circuitos cumplen hasta 3 px/0.40 s;
- Santa Cruz detecta nueve secuencias;
- Santa Cruz: 27.83 y 27.70 s consecutivos;
- 20.5 cambios de signo de volante por vuelta;
- uso máximo medido de piano: 2.9 px durante 0.28 s;
- el sistema es geométrico y reutilizable; no copia la vuelta ni contiene coordenadas específicas de Santa Cruz.

La referencia humana de 17.301 s es un objetivo de comportamiento y competitividad, no una garantía de igualdad inmediata: falta homologación visual y calibración posterior por coche.

## Validación del bloqueo posterior a maniobra (2026-08-22)

La prueba visual detectó que, tras recortar un vértice y rebasar brevemente la referencia, CPU1 podía volver a armar la misma maniobra con el objetivo ya situado detrás. El resultado era un contravolante hacia el lado opuesto y una pérdida desproporcionada de uno o dos segundos.

Corrección aplicada:

- el identificador de una maniobra terminada queda bloqueado hasta abandonar su zona anotada;
- la salida de la maniobra mantiene una fase de liberación de 0,48 s;
- durante esa liberación, un cambio de signo contrario al volante existente queda limitado a 2,2 unidades/s;
- se conserva la tolerancia transversal de 28 px durante la liberación para no castigar una comida breve de piano.

Validación sintética de 60 s en los 17 circuitos homologados: 17/17 sin superar el criterio de inseguridad (más de 3 px fuera durante más de 0,40 s). Las liberaciones solo aparecieron donde el clasificador encontró maniobras enlazadas: Karting Canarias, Karting Tenerife y Santa Cruz. Santa Cruz completó dos vueltas en la ventana, con 15 liberaciones y sin salida medida por encima del margen.

## Iteración de vértice interior (2026-08-22)

Referencia humana aportada: vueltas a medio gas entre 19,718 y 20,948 s; vuelta rápida de 17,884 s. La versión anterior de CPU1 simulaba 26,350 s y visualmente recorría el centro de las curvas.

Se añadió un compromiso interior moderado (0,20), se elevó el perfil de velocidad en curva y se impidió cruzar a contravolante durante la liberación cuando el error angular es inferior a 0,34 rad. Resultado sintético definitivo en Santa Cruz: 24,250 s, mejora de 2,100 s. Sigue pendiente bajar de 22,000 s. La métrica `releaseOppositeSuppressed` permite comprobar cuántos fotogramas evitaron una corrección opuesta menor.

## Cronómetro real en dispositivo

El modo experimental `planner_v1` muestra provisionalmente los tiempos de CPU1 en el informe final: mejor, media, diferencia con el jugador y vueltas individuales. El cronómetro se arma en el primer cruce válido de meta y solo acepta vueltas completas posteriores. No persiste datos ni participa en récords o economía. Este dato real de dispositivo pasa a ser la referencia principal para alcanzar el objetivo de menos de 22,000 s en Santa Cruz; la simulación se conserva para comparar regresiones.

### Incidencia de cronometraje real

En dispositivo, una pasada por meta no intersectó el segmento geométrico: dos vueltas humanas quedaron combinadas en 37,037 s y el informe mostró cuatro registros. Se añadió detección redundante por wrap de progreso para jugador y CPU1, con deduplicación temporal de 2 s. También se corrigió la visibilidad del panel para conservarlo cuando CPU1 haya sido eliminado antes de abrir resultados. Pendiente: confirmar una sesión 5/5 con cinco tiempos humanos coherentes y los tiempos CPU1 visibles hasta su eliminación.

### Fuente autoritativa de cronometraje

Después de comprobar que el detector redundante seguía dejando 5 vueltas competitivas como 4 filas, el cronómetro se trasladó al mismo punto que incrementa `completedLaps`. Cada corredor conserva `_survivalLapTimesMs`; tanto el informe humano como el panel CPU1 leen esa matriz. Se retiró el respaldo de wrap del flujo de cronometraje para evitar dos relojes independientes. Pendiente confirmar en dispositivo el invariante 5 completedLaps = 5 tiempos y la aparición del panel CPU1.

## Línea base y enseñanza online

Línea base real previa: CPU1 20,15 / 20,09 / 20,09 s (mejor 20,09; media 20,11). Humano 17,169 s de mejor vuelta.

La primera fase de enseñanza captura una vuelta humana por bins del plan, exige 58 % de cobertura, filtra muestras fuera de pista y limita el desplazamiento al 96 % del corredor. Tres pasadas de suavizado evitan copiar microcorrecciones. La mezcla se activa al terminar una vuelta de CPU1: V1=0 %, luego 18/30/42/55 % como máximo. Una prueba sintética de ciclo completo confirmó plan válido, mezcla convergente y todas las coordenadas/velocidades finitas. Falta la validación decisiva en dispositivo comparando V1 contra V2/V3.

