# Monte Carlo de progresión completa de piezas

Fecha: 2026-08-21
Estado: simulación sobre la economía implementada en `main`

## Objetivo

Medir cuántas partidas/sesiones necesita un jugador, partiendo de inventario cero y sin compras ni packs de tienda, para poder equipar simultáneamente las cinco familias del coche en cada categoría:

- 5 × Street
- 5 × Sport
- 5 × Racing
- 5 × Prototype

## Base simulada

La simulación reproduce el modelo actual:

- cuotas de tirada: Chatarra 38 %, Aleación/Goma/Disco/Muelle/Engranaje 10 % cada una, Compuesto 8 %, Electrónica 4 %;
- corrección adaptativa acumulada con `exp(2 × déficit)` y jitter 0,90–1,10;
- lotes: Chatarra 2–4, secundarios 1–3, Compuesto 1–2, Electrónica 1;
- Supervivencia completa de 5 vueltas: 10 tiradas garantizadas + Binomial(5, 0,60) + 2 del cofre de vuelta 5, es decir unas 15 tiradas de media;
- inventario inicial de materiales = 0;
- no se cuentan compras, packs, duplicación de recompensas ni otras fuentes externas de materiales.

Se ejecutaron 10.000 jugadores virtuales independientes con semillas distintas.

## Coste acumulado de una colección completa

Para poder terminar las cinco familias de cada tier desde cero, los materiales acumulados mínimos equivalen a:

### Street completo

- Chatarra ×40
- Aleación ×2
- Goma ×2
- Disco ×2
- Muelle ×2
- Engranaje ×2

### Sport completo (incluye haber fabricado Street)

- Chatarra ×180 acumulada
- Aleación ×7
- Goma ×7
- Disco ×7
- Muelle ×7
- Engranaje ×7
- Compuesto ×15

### Racing completo (incluye Street + Sport)

- Chatarra ×430 acumulada
- cada material secundario ×16
- Compuesto ×40
- Electrónica ×10

### Prototype completo (incluye toda la cadena anterior)

- Chatarra ×880 acumulada
- cada material secundario ×32
- Compuesto ×90
- Electrónica ×25

## Resultado en sesiones completas de Supervivencia

| Objetivo | Media | P50 | P75 | P90 | P95 |
|---|---:|---:|---:|---:|---:|
| 5 Street | **2,95** | 3 | 3 | 3 | 3 |
| 5 Sport | **11,16** | 11 | 12 | 12 | 12 |
| 5 Racing | **25,89** | 26 | 27 | 27 | 28 |
| 5 Prototype | **52,91** | 53 | 54 | 55 | 56 |

Rangos observados en las 10.000 simulaciones:

- Street: 2–4 sesiones.
- Sport: 9–15 sesiones.
- Racing: 23–32 sesiones.
- Prototype: 47–64 sesiones.

El sistema adaptativo reduce mucho la dispersión: P50 y P90 quedan relativamente próximos incluso en Prototype.

## Conversión a tiempo real

El código no fija una duración universal en minutos porque el tiempo por vuelta depende de circuito y jugador. Para traducir sesiones a horas se usan tres escenarios prácticos de ciclo completo (carrera + pequeña transición):

| Objetivo | 5 min/sesión | 6 min/sesión | 7 min/sesión |
|---|---:|---:|---:|
| 5 Street | 0,25 h | **0,30 h** | 0,34 h |
| 5 Sport | 0,93 h | **1,12 h** | 1,30 h |
| 5 Racing | 2,16 h | **2,59 h** | 3,02 h |
| 5 Prototype | 4,41 h | **5,29 h** | 6,17 h |

Tomando **6 minutos por Supervivencia completa** como referencia operativa, el jugador medio alcanzaría aproximadamente:

- coche completo Street: **18 minutos**;
- coche completo Sport: **1 h 07 min acumulados**;
- coche completo Racing: **2 h 35 min acumulados**;
- coche completo Prototype: **5 h 17 min acumulados**.

Incremento medio desde el tier anterior con esa referencia:

- inicio → Street: ~0,30 h;
- Street → Sport: ~0,82 h adicionales;
- Sport → Racing: ~1,47 h adicionales;
- Racing → Prototype: ~2,70 h adicionales.

## Percentiles prácticos a 6 min/sesión

- Street P50/P90: ~0,30 h / ~0,30 h.
- Sport P50/P90: ~1,10 h / ~1,20 h.
- Racing P50/P90: ~2,60 h / ~2,70 h.
- Prototype P50/P90: ~5,30 h / ~5,50 h.

## Lectura de diseño

La igualdad entre familias funciona bien, pero el recorrido completo hasta Prototype es actualmente relativamente corto para un sistema que pretende sostener progresión y tienda a medio plazo: alrededor de 4,4–6,2 horas de juego activo según duración real de sesión, sin usar compras ni aceleradores.

Esto no implica cambiarlo automáticamente. Antes de endurecer recetas conviene decidir qué duración objetivo queremos para el metajuego completo. Si Prototype debe ser un hito de varios días/semanas, la economía actual necesita mayor escalado desde Racing/Prototype o límites/objetivos adicionales. Si se busca una campaña rápida y rejugable, el ritmo actual puede ser adecuado.

## Limitaciones

- Se asume que el jugador completa las cinco vueltas de cada sesión; ser eliminado antes reduce tiradas por intento y aumenta el tiempo real.
- No se modelan tiempos exactos de cada circuito: se presentan sesiones como unidad estable y una tabla 5/6/7 min para convertir a horas.
- No se incluyen packs de materiales, compras de monedas, vídeos recompensados ni otras futuras fuentes de materiales.
- Se asume que el jugador dedica los materiales a progresar estas cinco familias y no los gasta en otros sistemas.
