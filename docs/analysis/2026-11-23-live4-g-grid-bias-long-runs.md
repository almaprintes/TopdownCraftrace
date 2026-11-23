# CraftRace · LIVE 4 DEV G — parrilla, Elo, dados y plan de carreras largas

**Fecha de registro:** 23/11/2026  
**Estado:** tres carreras de 3 vueltas, dos carreras A/B de 10 vueltas y **una carrera adicional de 20 vueltas completadas**; confirmado que Elo y dados apenas separan los tiempos de las IA en Santa Cruz.  
**Circuito prioritario:** \`santa-cruz\` (sentido normal).  
**Vehículo:** Avenir Gripline (\`avenir_gripline\`). **Físicas declaradas:** v1.  
**Modalidad:** 1 humano + 3 IA, nivel 3 Experto, trazada G Bézier + dados.  
**Alcance de este cambio:** documentación exclusivamente. **Esta actualización documental incorpora el resultado B comunicado por el propietario; no modifica físicas, cronometraje, dados, Elo, parrilla, Supabase o Android/Play.**

## 1. Pregunta que resolveremos

El propietario observa que **la plaza 3 parece dar ventaja en la primera vuelta frente a la plaza 2**, independientemente de qué piloto la ocupe. Propone competir durante **más vueltas** para comprobar si esa ventaja de salida se reduce, permanece o aumenta a medida que se acumulan vueltas lanzadas.

**Precisión conceptual:** una diferencia de tiempo inicial no desaparece simplemente por completar más vueltas. La diferencia acumulada cambia en función del ritmo posterior de ambos pilotos, sus tiradas, tráfico y sucesos de carrera. Hace falta medir **tiempo acumulado por vuelta**, no solo la tabla de resultados finales.

## 2. Evidencia en iPhone: tres carreras Santa Cruz (datos recibidos 23/11)

Los tiempos que siguen son los **observados** en el JSON automático \`CRAFT_RACE_CALIBRACION\` / \`CRAFT_RACE_LIVE4_G_V1\` facilitado por el propietario. **No son resultados de un simulador.** Las tres primeras carreras fueron de **3 vueltas**; ya se ha recibido además una carrera A de **10 vueltas**, documentada en la sección 3 bis.

### Carrera A1 — parrilla inicial, espera humana 1.247 s tras GO

| Plaza | Piloto | Elo | V1 (s) | V2 (s) | V3 (s) | Total (s) |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Humano | — | 21.350 | 18.806 | 19.024 | 59.180 |
| 1 | Álex Falcón | 1800 | 20.583 | 19.573 | 19.730 | 59.886 |
| 2 | Vera Cometa | 1730 | 21.166 | 19.735 | 19.618 | 60.519 |
| 3 | Sira Nova | 900 | 20.883 | 19.701 | 19.602 | 60.186 |

- Ventaja de **plaza 3 sobre plaza 2 en V1: 0.283 s**.
- Ventaja de plaza 3 sobre plaza 2 en el **total: 0.333 s**.
- Diferencia acumulada de V2+V3 favorable a plaza 3: **0.050 s**.
- Álex ganó las tres IA; el humano ganó por 0.706 s frente a Álex.

### Carrera A2 — misma parrilla, espera humana 2.084 s tras GO

| Plaza | Piloto | Elo | V1 (s) | V2 (s) | V3 (s) | Total (s) |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Humano | — | 22.036 | 18.835 | 19.035 | 59.906 |
| 1 | Álex Falcón | 1800 | 20.752 | 19.585 | 19.885 | 60.222 |
| 2 | Vera Cometa | 1730 | 21.136 | 19.568 | 19.853 | 60.557 |
| 3 | Sira Nova | 900 | 20.886 | 19.568 | 19.902 | 60.356 |

- Ventaja de **plaza 3 sobre plaza 2 en V1: 0.250 s**.
- Ventaja de plaza 3 sobre plaza 2 en el **total: 0.201 s**.
- En V2+V3 la plaza 2 fue **0.049 s más rápida**; no recuperó del todo su desventaja inicial.
- Álex fue la IA más rápida; humano por delante de Álex por 0.316 s.

### Carrera B1 — Vera y Sira intercambiadas, espera humana 0 ms

| Plaza | Piloto | Elo | V1 (s) | V2 (s) | V3 (s) | Total (s) |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Humano | — | 19.871 | 19.133 | 18.729 | 57.733 |
| 1 | Álex Falcón | 1800 | 20.852 | 19.619 | 19.401 | 59.872 |
| 2 | Sira Nova | 900 | 21.169 | 19.518 | 19.402 | 60.089 |
| 3 | Vera Cometa | 1730 | 20.952 | 19.552 | 19.404 | 59.908 |

- Ventaja de **plaza 3 sobre plaza 2 en V1: 0.217 s**.
- Ventaja de plaza 3 sobre plaza 2 en el **total: 0.181 s**.
- En V2+V3 la plaza 2 fue **0.036 s más rápida**; tampoco revirtió la primera vuelta.
- Álex fue la IA más rápida; humano por delante de Álex por 2.139 s.

### Resumen comparativo de la hipótesis de parrilla

| Ordenación | Ventaja plaza 3 en V1 | Ventaja plaza 3 en total | Ventaja plaza 3 en V2+V3 |
|---|---:|---:|---:|
| A1: Vera 2, Sira 3 | +283 ms | +333 ms | +50 ms |
| A2: Vera 2, Sira 3 | +250 ms | +201 ms | −49 ms |
| B1: Sira 2, Vera 3 | +217 ms | +181 ms | −36 ms |

**Observación reproducida tres veces:** la plaza 3 tiene una primera vuelta entre **217 y 283 ms** más rápida que la plaza 2. En las dos últimas carreras la plaza 2 es levemente más rápida en V2+V3, pero no recupera la diferencia de V1.

**No demostrado todavía:** que el causante sea exclusivamente la posición física de salida. También pueden contribuir línea desde parrilla a meta, velocidad inicial, fase de control/cronometraje, dados, desviación efectiva, tráfico y colisiones. El intercambio A/B ayuda a aislar factores, pero **3 carreras de 3 vueltas no permiten identificar causalidad ni estimar una ventaja universal**.

## 3. Sobre Elo, dados y trazadas: separar mecanismos

- **Elo:** los pilotos están definidos en el catálogo local. En el experimento G, el Elo condiciona las **probabilidades de tirada**, no concede automáticamente un motor más potente. La identidad seleccionada debe pasar al director físico y al informe; no vale cambiar solo la etiqueta.
- **Dados G:** cada tirada modifica una línea Bézier planificada, con límites de seguridad. Dentro de una misma plaza, la escala calibrada pretende ser decreciente de 1 (peor) a 6 (ideal), pero el margen geométrico **no es comparable entre plazas**.
- Ejemplo observado en B1: **Sira en plaza 2, dado 1 → solo 1.13 px previstos**; **Álex en plaza 1, dado 4 → 7.20 px**. Esto es resultado de la limitación geométrica de cada plaza/patrón; no prueba que una tirada 1 siempre perjudique más que una 4 en carrera real.
- **Telemetría:** \`errorObjetivoMedioPx\` es el error físico del coche respecto a **su propia línea asignada**, no la separación a la Bézier ideal. Sin medir ambos, no cuantificar de forma causal el efecto de la tirada sobre el tiempo.
- En estas tres carreras todos los registros de \`frenadaMediaPct\`, \`fotogramasFrenandoPct\` y \`frenadaMaximaPct\` son 0. **No introducir frenada artificial**: con Avenir Gripline en estos circuitos puede no ser necesaria; probar exigencia de freno con coches más veloces/circuitos más cerrados en otra fase.
- Las tres carreras reportaron \`iaHitches=0\` y \`segundosSinIntegrar=0\`. Los 9 pilotos IA (3 × 3) alcanzaron meta.
- **Salida del humano:** \`salidaHumano.esperaPrimerMovimientoMs\` registró 1.247 s, 2.084 s y 0 ms. Es tiempo desde GO hasta superar el umbral de 8 px/s y está incluido en la primera vuelta humana. No confundir con salida física de las IA ni usar esa espera para estimar sesgo entre plazas IA.

### Trabajo ya realizado y herramientas disponibles

- **Guía de trazadas G en DEV:** Santa Cruz y Karting Canarias 4096, con perfil físico y dados calibrados. La versión calibrada se limitó a LIVE 4 DEV G; no trasladarla automáticamente a otros modos.
- **Benchmark previo:** 1.260 simulaciones con la física/controlador y 1.260 con la propuesta calibrada; se observaron diferencias medias a favor del dado 6, pero **no eran carreras completas de navegador con tráfico y colisiones**. No usar como predicción directa de vuelta iPhone.
- **Informes automáticos:** botón \`COPIAR INFORME IA\`, últimos 10 **informes de carrera** almacenados localmente (no límite de 10 vueltas); opción de copiar solo última carrera e iniciar una nueva tanda. Pegado del JSON en ChatGPT; no subir datos automáticamente a Supabase.
- **Selector de rivales:** en DEV LIVE 4 G de 1 humano, se pueden elegir pilotos por plaza (nombre, Elo, estilo y probabilidad de dados 5/6), con persistencia por circuito. En salas de varios humanos no se aplica la selección local para evitar divergencias.
- **Revancha:** misma parrilla y ajustes cuando procede. Para cambiar de plazas, hacerlo en la sala de configuración y verificar las posiciones antes de iniciar; no asumir que el botón «misma parrilla» intercambia pilotos.
- **FPS:** diagnóstico compacto movido al lateral para dejar libre el cronómetro, desplegable al tocar.
- **Número de vueltas:** el selector actual de LIVE 4 ofrece **1, 3, 5, 10 y 20**. El exportador recorre la lista completa de vueltas registradas; comprobar en dispositivo que la pantalla de resultados finaliza y copia las 10 vueltas de todos los participantes.

Referencias de implementación: \`src/game/ui/craftraceLiveV2Lobby.js\`, \`src/game/online/craftraceLiveV2RaceBridge.js\`, \`src/game/online/craftraceLiveV2BotDirector.js\`, \`src/game/online/craftraceLive4CalibrationReport.js\`, \`src/game/online/craftraceLive4AiSelection.js\`, \`src/game/online/craftraceLive4LapGates.js\`.

Cambios relacionados: [PR #55](https://github.com/almaprintes/TopdownCraftrace/pull/55) (calibración dados), [#56](https://github.com/almaprintes/TopdownCraftrace/pull/56) (informe), [#57](https://github.com/almaprintes/TopdownCraftrace/pull/57) (medición salida), [#58](https://github.com/almaprintes/TopdownCraftrace/pull/58) (nueva tanda), [#59](https://github.com/almaprintes/TopdownCraftrace/pull/59) (FPS), [#60](https://github.com/almaprintes/TopdownCraftrace/pull/60) (elegir pilotos).

## 3 bis. Primera carrera larga A — 10 vueltas (23/11/2026 21:12 UTC)

**Resultado real comunicado por el propietario; no son simulaciones nuevas.** Santa Cruz, Avenir Gripline, G Bézier + dados, dificultad 3, física 1, 10 vueltas, dirección normal y GO→primer movimiento humano = 0 ms.

**Configuración A:** Álex plaza 1 (Elo 1800), Vera plaza 2 (Elo 1730), Sira plaza 3 (Elo 900).

| Puesto | Plaza | Piloto | Total (ms) | Vueltas lanzadas V2–V10 media (ms) |
|---:|---:|---|---:|---:|
| 1 | 0 | Humano | 190836 | 18993.00 |
| 2 | 3 | Sira Nova | 196286 | 19476.33 |
| 3 | 2 | Vera Cometa | 196419 | 19470.78 |
| 4 | 1 | Álex Falcón | 196436 | 19511.33 |

**Datos por vuelta exactos (milisegundos); `V–S acum.` = ventaja positiva de plaza 3 sobre plaza 2 al completar esa vuelta.** Se han verificado todas las sumas contra los tiempos totales del informe.

| Vuelta | Humano | Álex (p1) | Vera (p2) | Sira (p3) | V–S acum. (ms) |
|---:|---:|---:|---:|---:|---:|
| 1 | 19899 | 20834 | 21182 | 20999 | +183 |
| 2 | 18902 | 19700 | 19573 | 19568 | +188 |
| 3 | 18801 | 19435 | 19414 | 19436 | +166 |
| 4 | 18940 | 19539 | 19473 | 19422 | +217 |
| 5 | 18852 | 19669 | 19535 | 19569 | +183 |
| 6 | 18768 | 19570 | 19570 | 19585 | +168 |
| 7 | 18951 | 19453 | 19434 | 19484 | +118 |
| 8 | 19402 | 19416 | 19418 | 19420 | +116 |
| 9 | 19219 | 19452 | 19452 | 19434 | +134 |
| 10 | 19102 | 19368 | 19368 | 19369 | +133 |

**Interpretación puntual, sin dar causalidad por demostrada:**

- V1 favorece a la plaza 3 en **183 ms**; al terminar 10 vueltas, la ventaja es de **133 ms**: se compensaron **50 ms** (solo un 27,3 % de la diferencia inicial).
- En las nueve vueltas lanzadas la plaza 2 promedió apenas **5,56 ms/vuelta mejor** que la plaza 3; eso explica que el diferencial inicial no se neutralice en esta carrera.
- **Álex vs Vera sí muestra compensación:** Álex tenía **348 ms** de ventaja sobre Vera tras la primera vuelta; Vera recuperó **365 ms** en V2–V10, igualó su tiempo acumulado tras V5 y V6, lo superó desde V7 y terminó **17 ms por delante**. No atribuirlo automáticamente al Elo: hay dados/posiciones diferentes.
- Los tres pilotos IA terminaron separados por solo **150 ms** en 10 vueltas, pese a que los Elo abarcan 900–1800.
- Dados: **Sira** 1×6, 2×3, 4×1 (nueve tiradas 1/2); **Vera** 5×5, 6×3, 4×2 (ocho tiradas 5/6); **Álex** 6×5, 5×2, 4×1, 3×2. Sira pudo sostener una media de V2–V10 muy similar a Vera aun con tiradas mucho peores, por lo que **la separación efectiva en tiempo de la perturbación G merece revisión**, sin concluir a partir de una sola carrera que las tiradas no funcionan.
- En Santa Cruz la desviación planificada a menudo queda geométricamente reducida según plaza: Vera con dados 5/6 osciló entre 0 y 0,11 px en su objetivo, Sira con dado 1 tuvo 7,19 px y Álex con 3 hasta 10,4 px. La desviación planificada no equivale al desvío físico ni a la pérdida de tiempo.
- Todas las cuatro series de 10 vueltas suman exactamente sus totales; 3 IA terminan; `iaHitches=0`, `segundosSinIntegrar=0`; frenada registrada 0 % en las 30 vueltas IA, lo que no exige introducir frenadas con este coche.
- **No confirma por sí sola que exista una ventaja geométrica por puesto**: solo muestra persistencia de un diferencial de primera vuelta en la configuración A y una compensación cuando existe mejor ritmo lanzado. La configuración invertida B llegó a continuación y queda comparada en la sección 3 ter.

**Actualización:** la carrera B de 10 vueltas ya se ha realizado; véase la sección 3 ter. **No se requieren más repeticiones por el momento.**

---

## 3 ter. Carrera larga B — intercambio completado (23/11/2026 21:23 UTC)

**Resultado REAL en iPhone, mismo Santa Cruz / Avenir Gripline / física 1 / 10 vueltas / G / Experto.** Intercambiados solo Sira y Vera: Álex p1 Elo 1800, Sira p2 Elo 900, Vera p3 Elo 1730. El humano no esperó tras GO (0 ms).

| Puesto | Plaza | Piloto | Total (ms) | Media V2–V10 (ms) |
|---:|---:|---|---:|---:|
| 1 | 0 | Humano | 190927 | 18982.78 |
| 2 | 3 | Vera Cometa | 196343 | 19492.00 |
| 3 | 2 | Sira Nova | 196426 | 19477.11 |
| 4 | 1 | Álex Falcón | 196610 | 19551.33 |

**40 tiempos por vuelta del JSON del propietario**, comprobados contra los totales:

| Vuelta | Humano | Álex p1 | Sira p2 | Vera p3 | ventaja p3 acumulada (ms) |
|---:|---:|---:|---:|---:|---:|
| 1 | 20082 | 20648 | 21132 | 20915 | +217 |
| 2 | 18687 | 19569 | 19518 | 19552 | +183 |
| 3 | 19108 | 19585 | 19518 | 19535 | +166 |
| 4 | 19526 | 19468 | 19386 | 19418 | +134 |
| 5 | 19235 | 19552 | 19418 | 19435 | +117 |
| 6 | 18788 | 19402 | 19435 | 19402 | +150 |
| 7 | 18828 | 19597 | 19614 | 19614 | +150 |
| 8 | 18836 | 19669 | 19569 | 19569 | +150 |
| 9 | 19101 | 19518 | 19451 | 19518 | +83 |
| 10 | 18736 | 19602 | 19385 | 19385 | +83 |

**Resultado A/B combinado:**

| Indicador | Carrera A: Vera p2, Sira p3 | Carrera B: Sira p2, Vera p3 |
|---|---:|---:|
| Ventaja de plaza 3 en V1 | 183 ms | 217 ms |
| Ventaja de plaza 3 tras V10 | 133 ms | 83 ms |
| Recuperación acumulada de plaza 2 en V2–V10 | 50 ms | 134 ms |
| Diferencia total entre las tres IA | 150 ms | 267 ms |
| Tiempo humano | 190836 ms | 190927 ms |

**Lectura:** A y B reproducen que la plaza 3 obtiene alrededor de dos décimas en la primera vuelta (+183 y +217 ms), con independencia del piloto. Después de nueve vueltas lanzadas, parte se recupera pero no se neutraliza. **Es evidencia de un sesgo asociado a la plaza, no prueba todavía su causa geométrica.** Las medias del humano entre A y B difieren solo 91 ms de tiempo total; la reproducibilidad del ensayo es razonable para esta comparación.

**Problema deportivo más grave:** 900 puntos Elo entre Álex y Sira pero los tres IA terminaron separados por 150–267 ms después de diez vueltas; las dos tandas las ganó el humano por 5.45–5.68 segundos. No se distinguen como pilotos de nivel diferente. En B, Sira con 900 Elo logró media lanzada **19477.11 ms**, mejor que Vera con 1730 Elo (**19492.00 ms**) y Álex con 1800 (**19551.33 ms**). Dados de B: Sira 5 tiradas de 1/2 y 2 tiradas de 5/6; Vera 2 tiradas de 1/2 y 6 de 5/6; Álex 1 tirada de 1/2 y 7 de 5/6. Además, en V7, V8 y V10 Sira y Vera registraron tiempos exactamente iguales, aun con dados y desviaciones diferentes. Todos los registros de frenada fueron 0, **lo cual no es un defecto por sí mismo** con el coche actual; sin hitches y sin segundos sin integrar.

**Código comprobado 23/11/2026 (rama main):**
- `src/game/ai/craftraceAiEloLeague.js` muestra que `rollEloAiDie(elo)` cambia las probabilidades de las 6 caras.
- En `src/game/online/craftraceLiveV2BotDirector.js`, los tres IA de nivel 3 reciben el mismo `LIVE4_AI_LEVELS[3]`, el mismo `maxFwd`, `accel`, agarre y límites físicos, y `live4AiSeatPaceBias` devuelve 1 en G. El Elo se utiliza para tirar el dado: **no existe una pericia de conductor distinta por Elo aparte de su efecto indirecto en la desviación planificada**.
- `_bezierProfileForDie` obtiene un `buildBezierDieVariant` y recalcula perfil; `trackBezierAiRacingLinePlanner.js` limita la perturbación según la forma de pista, radio del coche, curvatura y margen de seguridad, con 20% extra de margen. Por eso la perturbación puede acercarse a cero en plazas o trazados restrictivos: con dados distintos, las trayectorias físicas pueden seguir siendo casi iguales.
- No atribuir el problema a que se haya ignorado el piloto elegido: la identidad y su Elo se usan en el controlador y aparecen correctamente en el informe. **El problema está en que ese Elo prácticamente no se traduce en diferencia real de pericia y ritmo en esta pista.**

**Decisión tras recibir B:** parar las tandas repetitivas; no pedir al propietario 20 vueltas ni más ensayos idénticos. Antes de volver a correr, realizar auditoría de **distancia real de parrilla a primera puerta/meta** y diseñar un efecto **medible de pericia del conductor** (optimización de trayectoria, anticipación de curvas, recuperación de correcciones y decisiones), sin dar a IA motores o agarres ilegales, sin frenadas forzadas y sin penalizadores artificiales de velocidad por Elo. Introducir un test controlado de pilotos con dados prefijados y mismo punto de partida para separar efecto de dado/Elo de la posición. Solo tras la auditoría y validación de pruebas automáticas considerar cambios en DEV G y nueva tanda de verificación.

**Estado:** diagnóstico confirmado en código; la implementación o modificación de conducción por Elo **todavía no está hecha ni validada**.

---

## 3 quater. Carrera adicional de 20 vueltas — colapso competitivo de Elo (23/11/2026 21:41 UTC)

**Informe real del usuario** `CRAFT_RACE_LIVE4_G_V1`, fecha UTC `2026-11-23T21:41:05.260Z`, Santa Cruz forward, Avenir Gripline, física v1, LIVE 4 G, IA Experto 3, sin espera humana después de GO (0 ms); plazas: humano 0, Álex Falcón (1800) 1, Sira Nova (900) 2, Vera Cometa (1730) 3. Se completaron **20 vueltas por piloto**, sin hitches ni segundos sin integrar.

| Puesto | Piloto | Elo | Tiempo final | Diferencia al humano | Tiradas 5–6 /20 | Tiradas 1–2 /20 |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Humano | — | 376674 ms (6:16.674) | — | — | — |
| 2 | Vera Cometa | 1730 | 391176 ms (6:31.176) | +14502 ms | 16 | 2 |
| 3 | Sira Nova | 900 | 391208 ms (6:31.208) | +14534 ms | 0 | 17 |
| 4 | Álex Falcón | 1800 | 391275 ms (6:31.275) | +14601 ms | 19 | 0 |

Los 80 tiempos por vuelta han sido sumados y cotejados con los totales del informe; no se reproducen aquí todos los campos individuales para mantener el documento legible. **Los tres IA terminan en una ventana de solo 99 ms a lo largo de 20 vueltas**, pese a una diferencia de 900 Elo y distribuciones de dados radicalmente distintas. El hecho de que 19/20 tiradas de Álex fueran 5/6 mientras Sira tuvo 17/20 de 1/2 demuestra que el Elo **sí afecta al dado**; no está causando una separación suficiente en **ritmo de conducción real**. Álex terminó por detrás de Sira por 67 ms, dentro de esa ventana.

**Ventaja acumulada del humano sobre la IA más cercana**, segundos al terminar cada vuelta:

| Vueltas | V1 | V2 | V3 | V4 | V5 | V6 | V7 | V8 | V9 | V10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ventaja (s) | .869 | 1.784 | 2.364 | 2.750 | 3.433 | 4.217 | 5.082 | 5.783 | 6.867 | 7.624 |

| Vueltas | V11 | V12 | V13 | V14 | V15 | V16 | V17 | V18 | V19 | V20 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ventaja (s) | 8.267 | 9.134 | 9.701 | 10.184 | 10.550 | 11.334 | 12.250 | 13.258 | 14.161 | 14.502 |

La ventaja superó los 6 s **al finalizar V9**, y aumentó otros **6.878 s entre V10 y V20**. Esto **descarta un tope rígido observado de 6 s** y matiza la impresión anterior de estancamiento, aunque no prueba que cualquier posible mecanismo condicional esté ausente de todo el juego. El humano completó las últimas 10 vueltas en 187567 ms frente a 189107 ms en las 10 primeras, una mejora de 1540 ms.

**Plaza 3 vs 2 en esta carrera:** Vera (p3) ganó V1 a Sira (p2) por **283 ms** (20941 vs 21224). Tras 20 vueltas terminó **32 ms por delante** (391176 vs 391208). La plaza 2 recuperó **251 ms** durante V2–V20; no se neutralizó totalmente la diferencia inicial. Resultado consistente con las diferencias iniciales de ~0.2 s en las dos carreras A/B de 10 vueltas; persiste la incertidumbre sobre la causa de ese diferencial.

**Dato físico adicional:** las últimas vueltas IA fueron Álex 19285 ms, Sira 19268 ms y Vera 19270 ms (17 ms de diferencia máxima); la semejanza no es solo de tiempos agregados. Las 60 vueltas IA registraron frenada 0 %, sin necesidad de forzar freno para este coche.

**Conclusión operativa:** no solicitar más carreras de 10/20 vueltas con el sistema actual. Auditar/controlar (a) distancia inicial y cronometraje por plaza, y (b) que los distintos dados alteren realmente decisiones de conducción/tiempos respetando el mismo motor, agarre y físicas. Preparar ensayos automáticos con misma plaza y dados controlados, medición de lap delta y separación de distancias, antes de que el propietario vuelva a gastar seis minutos en otra carrera.

**Estado:** registro y diagnóstico **documental**, ninguna modificación de controlador/IA ni de despliegues por esta entrada.

---

## 4. Protocolo A/B de 10 vueltas — EJECUTADO (referencia para regresiones futuras)

**A y B ya están completadas y analizadas; no volver a pedirlas sin justificación técnica nueva.** Se conserva este protocolo exclusivamente para poder repetirlo después de corregir el sistema de pericia IA:

1. Abrir la versión DEV web verificada de GitHub Pages (no Vercel/Google Play) y configurar \`LIVE 4\` en **Santa Cruz**, sentido normal, **Avenir Gripline**, 4 plazas, **1 humano + 3 IA**, nivel **3 Experto**, **G Bézier + dados**, **10 vueltas**. Física v1, si no ha cambiado; anotar cualquier cambio.
2. Mantener la **plaza 0 humana** y la **plaza 1 de Álex Falcón (Elo 1800)**. No cambiar coche, circuito, opciones o control entre tandas.
3. **Configuración A:** plaza 2 = Vera Cometa (Elo 1730), plaza 3 = Sira Nova (Elo 900).
4. **Configuración B:** plaza 2 = Sira Nova (Elo 900), plaza 3 = Vera Cometa (Elo 1730).
5. Recomendación inicial: **dos carreras de 10 vueltas, A y B**. Si son estables y el usuario quiere más evidencia, **cuatro carreras con orden A–B–B–A**, para compensar parcialmente variación entre carreras, aprendizaje y azar de dados. La revancha solo vale si conserva la configuración prevista; cuando toque intercambio, revisar el selector antes de salir.
6. **Sin ventajas voluntarias de 1–5 s** en esta prueba: salir normalmente después de GO. El objetivo es aislar **efecto de plaza**. La espera medida del humano sigue en el JSON, pero no interviene en el contraste entre plazas 2 y 3.
7. No modificar físicamente la IA, el agarre, el máximo de velocidad, la fórmula de dados ni las posiciones iniciales entre A y B. No forzar frenadas: el coche actual puede no necesitarlas.
8. Al terminar cada carrera, confirmar **10 tiempos y 10 dados por IA**, cero fallos de registro; copiar **solo la carrera actual** o **la nueva tanda** y pegarla para análisis. No hace falta capturar pantallas. Al guardar una tanda de cuatro, mantenerla por debajo del máximo de 10 informes.

**Decisión tras A/B:** 20 vueltas no aportarían un diagnóstico proporcional al esfuerzo mientras todos los pilotos expertos compartan prácticamente la misma capacidad de conducción. **No pedir 20 vueltas por ahora.** No confundir estas carreras DEV con pruebas de multijugador de 2–4 humanos.

## 5. Método de análisis aplicado a A/B (conservar para futuras regresiones)

Para cada carrera, para las **plazas 2 y 3**:

- \`L_{p,k}\`: duración en segundos de la vuelta \`k\` de la plaza \`p\`.
- \`D_1 = L_{2,1} - L_{3,1}\`: ventaja inicial de la plaza 3 (positiva si plaza 3 hizo V1 más rápida).
- \`D_n = sum_{k=1..n}(L_{2,k}-L_{3,k})\`: **ventaja acumulada** de la plaza 3 al terminar V\`n\`.
- \`r = mean_{k=2..N}(L_{2,k}-L_{3,k})\`: diferencia media de ritmo en vueltas lanzadas. Si \`r < 0\`, la plaza 2 recupera tiempo; si \`r > 0\`, la plaza 3 gana más ventaja. Si \`r ≈ 0\`, la ventaja V1 se mantiene casi íntegra.
- Para describir, no predecir literalmente, la neutralización: si \`D_1 > 0\` y \`r < 0\` aproximadamente constante, \`n_cruce ≈ 1 + D_1/(-r)\`. Comparar esa aproximación con el **primer paso real por cero** de \`D_n\`; si el ritmo no es constante, el cruce hipotético no es fiable.
- Presentar gráfico **D_n vs vuelta** hasta 10 y tabla **V1 vs promedio V2–V10** por plaza; no limitarse al tiempo final.
- Contrastar **por piloto**: Vera en plaza 2 vs Vera en plaza 3, Sira en 2 vs Sira en 3, y Álex constante en plaza 1 como referencia de variación global entre carreras.
- Desglosar **dados, Elo, perturbación Bézier efectiva, error a línea objetivo, velocidad media, hitches y segundos sin integrar**, sin identificar un efecto causal de dado/Elo con una muestra pequeña.
- Cuando existan incidentes de contacto, bloqueos o salidas, anotarlos y **no atribuir** su tiempo a la plaza. El informe actual no registra todos los encuentros con otros coches, así que son un posible factor de confusión.
- Diferenciar el **tiempo de primera vuelta desde la parrilla**, el **ritmo por vuelta lanzada** y las **diferencias acumuladas**.

### Interpretación esperada, sin anticipar resultados

| Lo observado en 10 vueltas | Lectura prudente |
|---|---|
| V1 favorece a plaza 3, pero \`D_n\` se aproxima a cero | Ritmo posterior compensa, parcial o totalmente, el diferencial inicial |
| V1 favorece a plaza 3 y \`D_n\` permanece aproximadamente constante | Diferencial inicial persistente, ritmo lanzado comparable |
| V1 favorece a plaza 3 y \`D_n\` aumenta | También hay ventaja de ritmo posterior o factores de carrera que la reproducen |
| El signo cambia con el piloto al intercambiar plazas | El piloto, los dados o tráfico pueden pesar más que la posición; hace falta repetir |
| Las carreras terminan pero los JSON pierden vueltas | Fallo de telemetría, **no** evidencia deportiva; arreglar exportación antes de calibrar |

## 6. Criterios para decidir cambios técnicos

**No corregir todavía la parrilla ni el motor de IA.** Primero se necesita:

- Evidencia de al menos un par **A/B de 10 vueltas**, preferiblemente A–B–B–A si el usuario desea continuar.
- Verificar diferencias consistentes en V1 y cuánto se neutralizan en V2–V10.
- Confirmar que el resultado no proviene de tiempos incompletos, de posición de meta mal aplicada, de una vuelta no homologada o de incidentes de carrera.
- Si el sesgo inicial persiste después del intercambio, investigar **geometría real del punto de salida respecto a la meta, distancia hasta la primera línea de control, velocidad de arranque y cruces de checkpoints**; comparar longitudes de recorrido sin alterar el cronometraje.
- Si el problema es geometría de la parrilla, proponer un arreglo propio para parrilla/salida, **no un multiplicador de velocidad escondido** por puesto, Elo o tirada.
- Mantener mismo coche y físicas para jugador e IA; habilidad debe venir de trazada, selección de acciones y aprovechamiento del agarre. No forzar frenos que el coche no necesita.
- Cualquier corrección futura se probará en DEV con regresión de cronometraje y revancha **antes** de integrar; ninguna intervención en Play, nativo, Supabase o despliegues a Vercel por esta documentación.

**Siguiente paso pendiente:** la carrera B ya está recibida; auditar técnicamente la parrilla y el mecanismo real de pericia Elo antes de pedir más tandas. **Este documento recoge las dos carreras reales A/B de 10 vueltas y la adicional de 20 vueltas aportadas por el propietario; no se han ejecutado simulaciones ni carreras nuevas mediante esta actualización documental.**
