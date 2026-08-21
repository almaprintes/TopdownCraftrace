# Modelo matemático de equilibrio DROP → CRAFT

Fecha: 2026-08-21
Estado: propuesta matemática para validar antes de modificar gameplay

## Objetivo innegociable

Dentro de una misma categoría, las cinco familias de piezas deben tener aproximadamente la misma dificultad/tiempo esperado de fabricación. La familia elegida no puede penalizar al jugador por usar un material más raro.

La dificultad la determina el tier:

I Street < II Sport < III Racing < IV Prototype.

Desde Sport se consume además 1 pieza del tier inmediatamente anterior.

## Hallazgo sobre el sistema actual

El loot actual de `garageStore.js` no tiene rarezas globales controladas por material. Los siete materiales no-ECU están en `COMMON_LOOT` y cada circuito elige tres afinidades que reciben peso 2 frente a peso 1. Electrónica/ECU usa un drop separado con pity. Por tanto, la dificultad efectiva de una receta puede variar por circuito y por los materiales que use.

El inventario inicial actual también entrega: Chatarra 8, Aleación 5, Goma 4, Compuesto 4, Disco 4, Muelle 3, Engranaje 3 y ECU 2. Esto debe revisarse junto al nuevo modelo porque puede hacer que algunas recetas Street estén prácticamente prepagadas.

## Distribución objetivo inicial

Estos porcentajes son cuotas de equilibrio a largo plazo, no probabilidades rígidas por tirada:

| Material | Cuota objetivo |
|---|---:|
| Chatarra | 34% |
| Goma | 16% |
| Aleación | 16% |
| Disco metálico | 9% |
| Muelle | 7% |
| Engranaje | 7% |
| Compuesto | 7% |
| Electrónica | 4% |

Total = 100%.

La implementación final debe permitir una banda alrededor del objetivo y corregir suavemente desviaciones acumuladas, de modo que exista azar local pero convergencia estadística a largo plazo. No usar una secuencia fija tipo «cada N drops».

## Fórmula central

Sea `p_m` la cuota de drop objetivo del material `m` y `T_c` el presupuesto de drops equivalente del tier `c`.

Para cada material usado por una receta:

`Q(c,m) ≈ round(p_m × T_c)`

La dificultad temporal aproximada de una receta se estima por su cuello de botella:

`D(receta) = max_m ( Q(receta,m) / p_m )`

Diseñamos las recetas de una misma categoría para que sus valores `D` sean aproximadamente iguales.

Esto hace que un material raro exija pocas unidades y uno frecuente muchas, compensando automáticamente su frecuencia de aparición.

## Presupuestos iniciales para simulación

- Street: T = 25
- Sport: T = 55 + pieza Street ×1
- Racing: T = 100 + pieza Sport ×1
- Prototype: T = 170 + pieza Racing ×1

No son todavía valores definitivos. Deben validarse mediante Monte Carlo contra la duración real de las sesiones.

## Matriz resultante inicial

### I Street

- Motor: Chatarra 8 · Aleación 4 · Electrónica 1
- Frenos: Chatarra 8 · Aleación 4 · Disco 2 · Compuesto 2
- Neumáticos: Chatarra 8 · Goma 4 · Aleación 4 · Compuesto 2
- Suspensión: Chatarra 8 · Aleación 4 · Muelle 2
- Transmisión: Chatarra 8 · Aleación 4 · Engranaje 2

### II Sport

Todas consumen además la pieza Street correspondiente ×1.

- Motor: Chatarra 19 · Aleación 9 · Electrónica 2
- Frenos: Chatarra 19 · Aleación 9 · Disco 5 · Compuesto 4
- Neumáticos: Chatarra 19 · Goma 9 · Aleación 9 · Compuesto 4
- Suspensión: Chatarra 19 · Aleación 9 · Muelle 4
- Transmisión: Chatarra 19 · Aleación 9 · Engranaje 4

### III Racing

Todas consumen además la pieza Sport correspondiente ×1.

- Motor: Chatarra 34 · Aleación 16 · Electrónica 4
- Frenos: Chatarra 34 · Aleación 16 · Disco 9 · Compuesto 7
- Neumáticos: Chatarra 34 · Goma 16 · Aleación 16 · Compuesto 7
- Suspensión: Chatarra 34 · Aleación 16 · Muelle 7
- Transmisión: Chatarra 34 · Aleación 16 · Engranaje 7

### IV Prototype

Todas consumen además la pieza Racing correspondiente ×1.

- Motor: Chatarra 58 · Aleación 27 · Electrónica 7
- Frenos: Chatarra 58 · Aleación 27 · Disco 15 · Compuesto 12
- Neumáticos: Chatarra 58 · Goma 27 · Aleación 27 · Compuesto 12
- Suspensión: Chatarra 58 · Aleación 27 · Muelle 12
- Transmisión: Chatarra 58 · Aleación 27 · Engranaje 12

## Restricciones de diseño

1. Chatarra siempre es el principal sumidero en unidades.
2. Las cantidades disminuyen al aumentar el valor/rareza del material.
3. Ninguna familia puede tener un cuello de botella sistemáticamente mayor que otra del mismo tier.
4. Street debe ser alcanzable durante la primera sesión normal, no necesariamente antes de correr.
5. No basta con igualar medias: validar P50, P75 y P90 para detectar mala suerte/frustración.
6. El sistema de drop debe converger hacia las cuotas objetivo a largo plazo mediante corrección suave de pesos.
7. Afinidades de circuito, si se conservan, no pueden romper la igualdad de dificultad entre familias; deben ser variación local compensada a largo plazo.
8. Tienda y packs de materiales deberán valorarse con la misma economía, no con precios arbitrarios.

## Siguiente simulación necesaria

Antes de llevar estas cifras a `partsCatalog.js` hay que fijar qué significa exactamente una «primera sesión normal» en número medio de vueltas/drops. Después ejecutar simulación Monte Carlo de muchos jugadores y medir para cada familia/tier:

- probabilidad de poder fabricar;
- sesiones P50/P75/P90;
- diferencia máxima entre familias;
- materiales sobrantes acumulados;
- cuellos de botella;
- tiempo acumulado hasta completar cada colección de cinco piezas.

Objetivo recomendado de igualdad entre familias del mismo tier: diferencia máxima de probabilidad <= 5 puntos porcentuales y tiempos P50/P90 muy próximos.
