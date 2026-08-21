# Monte Carlo — balance de drops y fabricación

Fecha: 2026-08-21
Estado: análisis previo a implementación; NO sustituye todavía las recetas productivas.

## Objetivo de diseño

Dentro de un mismo tier (Street/Sport/Racing/Prototype), Motor, Frenos, Neumáticos, Suspensión y Transmisión deben tener dificultad estadística equivalente. La dificultad debe crecer entre tiers, no entre familias.

Street debe ser alcanzable durante la primera sesión de juego, independientemente de la familia elegida.

## Distribución candidata analizada

- Chatarra: 34 %
- Goma: 16 %
- Aleación: 16 %
- Disco: 9 %
- Muelle: 7 %
- Engranaje: 7 %
- Compuesto: 7 %
- Electrónica: 4 %

Total: 100 %.

## Recetas Street candidatas analizadas

- Motor: Chatarra 8 + Aleación 4 + Electrónica 1
- Frenos: Chatarra 8 + Aleación 4 + Disco 2 + Compuesto 2
- Neumáticos: Chatarra 8 + Goma 4 + Aleación 4 + Compuesto 2
- Suspensión: Chatarra 8 + Aleación 4 + Muelle 2
- Transmisión: Chatarra 8 + Aleación 4 + Engranaje 2

## Simulación

Se realizaron pruebas Monte Carlo con 50.000 jugadores virtuales por escenario, sorteando materiales mediante distribución multinomial según los pesos candidatos. Se midió la posibilidad de fabricar cada familia Street tras sesiones con diferentes cantidades de drops.

Sin inventario inicial, 25 drops por sesión produjo en la primera sesión aproximadamente:

- Motor: 19,6 %
- Frenos: 8,1 %
- Neumáticos: 5,8 %
- Suspensión: 14,8 %
- Transmisión: 15,0 %

Con 40 drops por sesión:

- Motor: 70,7 %
- Frenos: 59,5 %
- Neumáticos: 60,6 %
- Suspensión: 68,3 %
- Transmisión: 68,3 %

Conclusión: aunque el coste ponderado parecía parecido, la simple fórmula Q≈p×T NO basta para igualar la probabilidad de completar recetas multicomponente. Las recetas con más tipos distintos de material sufren una penalización combinatoria. Debe optimizarse la distribución completa, no únicamente el valor esperado de cada ingrediente.

## Hallazgo crítico: inventario inicial actual

El juego inicia actualmente con:

- Chatarra 8
- Aleación 5
- Goma 4
- Compuesto 4
- Disco 4
- Muelle 3
- Engranaje 3
- Electrónica 2

Ese inventario ya satisface por sí solo TODAS las recetas Street candidatas anteriores. En simulación, cualquier cantidad adicional de drops dio 100 % de disponibilidad de las cinco familias en la primera sesión.

Por tanto, el inventario inicial actual invalida la medición de una progresión Street real: el jugador prácticamente empieza con la primera pieza ya pagada.

## Consecuencia de diseño

Hay que separar dos conceptos:

1. **Kit inicial/tutorial:** recursos entregados al empezar.
2. **Economía de drop normal:** distribución sostenible durante el resto del juego.

Si queremos que el jugador FABRIQUE su primera Street durante la primera sesión, y no simplemente pueda fabricarla al arrancar, el kit inicial debe reducirse o diseñarse explícitamente como una ayuda parcial.

## Nuevo criterio matemático

No optimizar únicamente `max(Q/p)`. La función objetivo debe considerar simultáneamente:

- diferencia máxima de probabilidad de fabricación entre familias del mismo tier;
- P50/P75/P90 de sesiones hasta fabricar;
- penalización por receta con demasiados ingredientes independientes;
- acumulación sobrante de cada material;
- frecuencia de cuellos de botella;
- progresión acumulativa Street → Sport → Racing → Prototype;
- pieza anterior obligatoria para tiers II–IV.

Objetivo recomendado para Street tras una sesión normal:

- probabilidad de fabricar cada familia: 75–90 %;
- diferencia máxima entre familia más fácil y más difícil: <= 5 puntos porcentuales;
- P50: 1 sesión;
- P90: <= 2 sesiones.

## Siguiente iteración

Optimizar conjuntamente:

- pesos de drop;
- kit inicial;
- cantidades de las 20 recetas;
- número esperado de drops por sesión.

No aplicar todavía cifras productivas hasta cerrar estos cuatro parámetros juntos.
