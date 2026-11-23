# CraftRace · LIVE 4 DEV G — parrilla, Elo, dados y plan de carreras largas

**Fecha de registro:** 23/11/2026  
**Estado:** documentación de resultados observados + protocolo de prueba **PENDIENTE**.  
**Circuito prioritario:** \`santa-cruz\` (sentido normal).  
**Vehículo:** Avenir Gripline (\`avenir_gripline\`). **Físicas declaradas:** v1.  
**Modalidad:** 1 humano + 3 IA, nivel 3 Experto, trazada G Bézier + dados.  
**Alcance de este cambio:** documentación exclusivamente. **No se han ejecutado nuevas carreras ni se han alterado físicas, cronometraje, dados, Elo, parrilla, Supabase o Android/Play.**

## 1. Pregunta que resolveremos

El propietario observa que **la plaza 3 parece dar ventaja en la primera vuelta frente a la plaza 2**, independientemente de qué piloto la ocupe. Propone competir durante **más vueltas** para comprobar si esa ventaja de salida se reduce, permanece o aumenta a medida que se acumulan vueltas lanzadas.

**Precisión conceptual:** una diferencia de tiempo inicial no desaparece simplemente por completar más vueltas. La diferencia acumulada cambia en función del ritmo posterior de ambos pilotos, sus tiradas, tráfico y sucesos de carrera. Hace falta medir **tiempo acumulado por vuelta**, no solo la tabla de resultados finales.

## 2. Evidencia en iPhone: tres carreras Santa Cruz (datos recibidos 23/11)

Los tiempos que siguen son los **observados** en el JSON automático \`CRAFT_RACE_CALIBRACION\` / \`CRAFT_RACE_LIVE4_G_V1\` facilitado por el propietario. **No son resultados de un simulador.** Las carreras fueron de **3 vueltas**; no existe todavía resultado de carrera larga.

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

## 4. Experimento acordado para después: carreras de 10 vueltas

**No ejecutar ni modificar código ahora.** Cuando el propietario quiera probar:

1. Abrir la versión DEV web verificada de GitHub Pages (no Vercel/Google Play) y configurar \`LIVE 4\` en **Santa Cruz**, sentido normal, **Avenir Gripline**, 4 plazas, **1 humano + 3 IA**, nivel **3 Experto**, **G Bézier + dados**, **10 vueltas**. Física v1, si no ha cambiado; anotar cualquier cambio.
2. Mantener la **plaza 0 humana** y la **plaza 1 de Álex Falcón (Elo 1800)**. No cambiar coche, circuito, opciones o control entre tandas.
3. **Configuración A:** plaza 2 = Vera Cometa (Elo 1730), plaza 3 = Sira Nova (Elo 900).
4. **Configuración B:** plaza 2 = Sira Nova (Elo 900), plaza 3 = Vera Cometa (Elo 1730).
5. Recomendación inicial: **dos carreras de 10 vueltas, A y B**. Si son estables y el usuario quiere más evidencia, **cuatro carreras con orden A–B–B–A**, para compensar parcialmente variación entre carreras, aprendizaje y azar de dados. La revancha solo vale si conserva la configuración prevista; cuando toque intercambio, revisar el selector antes de salir.
6. **Sin ventajas voluntarias de 1–5 s** en esta prueba: salir normalmente después de GO. El objetivo es aislar **efecto de plaza**. La espera medida del humano sigue en el JSON, pero no interviene en el contraste entre plazas 2 y 3.
7. No modificar físicamente la IA, el agarre, el máximo de velocidad, la fórmula de dados ni las posiciones iniciales entre A y B. No forzar frenadas: el coche actual puede no necesitarlas.
8. Al terminar cada carrera, confirmar **10 tiempos y 10 dados por IA**, cero fallos de registro; copiar **solo la carrera actual** o **la nueva tanda** y pegarla para análisis. No hace falta capturar pantallas. Al guardar una tanda de cuatro, mantenerla por debajo del máximo de 10 informes.

**Si 10 vueltas no bastan para resolver el comportamiento:** considerar 20, pero solo después de revisar los resultados y la estabilidad de 10. No confundir estabilidad de esta carrera con prueba de multijugador de 2–4 humanos.

## 5. Análisis a calcular cuando lleguen datos

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

**Siguiente paso pendiente:** esperar a que el propietario indique que quiere empezar las 10 vueltas; entonces validar la configuración, ejecutar A/B y analizar el JSON exportado. **No hay carreras nuevas ejecutadas ni resultados inventados en este documento.**
