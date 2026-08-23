# Homologación de mejoras — 2026-08-23

## Objetivo
Validar la progresión real de las 20 piezas equipables (5 familias × 4 tiers) y casar las mejoras visibles de stats con el comportamiento físico en pista, sin borrar la identidad de cada coche.

## Reglas de la prueba
- Series cortas de 3–4 vueltas.
- Mismo coche y circuito al comparar tiers de una misma familia.
- Solo una familia de pieza equipada durante cada secuencia de comparación.
- Registrar mejor vuelta, media útil, punta, uso de controles, salidas de pista y sensaciones.
- No considerar una mejora validada solo por una vuelta aislada; mirar también consistencia.
- Mantener BASE 1.0 de física stock sin tocar salvo defecto concreto.

## Filosofía de balance fijada
- Las piezas deben mejorar mucho el potencial del coche, especialmente T4.
- Cada T4 debe aportar al menos +16 en su atributo principal visible.
- Ningún coche maxeado debe converger a 99/99/99/99.
- Un coche extremo en velocidad debe conservar compromisos claros de control/agarre.
- La escala stock visible se ha reescalado al 75% para dejar espacio de progresión, sin alterar todavía la física stock.
- Paquete visible de las cinco T4 actualmente candidato: +28 Velocidad / +26 Aceleración / +25 Agarre / +37 Control.
- Barras de stats en Factoría: base blanca; aportes equipados segmentados con color de tier (T1 azul, T2 verde, T3 morado, T4 dorado); previsualización diferenciada.

## Secuencia 1 — Motor · VELOCE Flash · Karting Tenerife

### Tanda A — STOCK
Fecha: 2026-08-23
Coche: VELOCE Flash
Circuito: Karting Tenerife
Piezas: ninguna; completamente stock
Vueltas: 4

Resultados:
- V1: 43.932 s
- V2: 41.427 s
- V3: 41.775 s
- V4: 41.762 s
- Mejor: 41.427 s
- Media de sesión: 42.224 s
- Media útil V2–V4: 41.655 s
- Punta: 68 km/h
- Velocidad media: 59 km/h
- Consistencia σ: 1.00 s
- Salidas de pista: 5, total 7.3 s
- Gas: 88%
- Coasting: 12%
- Freno: 0%
- Frenadas: 0

Lectura:
- Baseline válida y muy próxima a la homologación stock previa del Flash (~41.5 s / 68 km/h).
- V2–V4 son muy consistentes y sirven como referencia principal para comparar Motor T1.
- Karting Tenerife resulta adecuado para medir potencia/aceleración porque esta tanda se hizo sin frenar y con 88% de gas.

### Tanda B — MOTOR T1 / STREET
Fecha: 2026-08-23
Coche: VELOCE Flash
Circuito: Karting Tenerife
Piezas: Motor T1 / Street; resto sin equipar
Vueltas: 4

Resultados:
- V1: 41.982 s
- V2: 45.591 s — vuelta contaminada por S2 de 18.317 s
- V3: 41.519 s
- V4: 40.854 s
- Mejor: 40.854 s
- Media de sesión: 42.486 s
- Media útil limpia V1/V3/V4: 41.452 s
- Punta: 69 km/h
- Velocidad media: 60 km/h
- Consistencia σ: 1.84 s
- Salidas de pista: 11, total 4.6 s
- Gas: 88%
- Coasting: 11%
- Freno: 1%
- Frenadas: 1
- Frenada más larga: 1.23 s

Comparación frente a STOCK:
- Mejor vuelta: 41.427 → 40.854 = mejora de 0.573 s (1.38%).
- Media útil: 41.655 → 41.452 = mejora de 0.203 s (0.49%).
- Punta: 68 → 69 km/h = +1 km/h.
- Velocidad media: 59 → 60 km/h = +1 km/h.
- La media bruta de sesión empeora por la V2 contaminada, por lo que no representa el potencial real de T1.

Lectura:
- Motor T1 produce una mejora real y medible en punta y tiempo.
- El salto es pequeño, apropiado para T1, pero perceptible: la mejor vuelta gana más de medio segundo.
- La dispersión de esta tanda obliga a seguir usando media de vueltas limpias además de la mejor vuelta.
- No se detecta aún un salto excesivo; se puede avanzar a T2 sin ajustar física.

### Tanda C — MOTOR T2 / SPORT
Fecha: 2026-08-23
Coche: VELOCE Flash
Circuito: Karting Tenerife
Piezas: Motor T2 / Sport; resto sin equipar
Vueltas: 4

Resultados:
- V1: 42.387 s
- V2: 41.632 s
- V3: 39.650 s
- V4: 39.489 s
- Mejor: 39.489 s
- Media de sesión: 40.789 s
- Media útil V2–V4: 40.257 s
- Media de las dos vueltas más representativas V3–V4: 39.570 s
- Punta: 71 km/h
- Velocidad media: 61 km/h
- Consistencia σ: 1.25 s
- Salidas de pista: 8, total 6.3 s
- Gas: 88%
- Coasting: 12%
- Freno: 0%
- Frenadas: 0

Comparación frente a MOTOR T1:
- Mejor vuelta: 40.854 → 39.489 = mejora de 1.365 s (3.34%).
- Punta: 69 → 71 km/h = +2 km/h.
- Velocidad media: 60 → 61 km/h = +1 km/h.
- Las dos últimas vueltas quedan en 39.650 y 39.489, señal de que el ritmo inferior a 40 s es repetible y no una vuelta aislada.

Comparación frente a STOCK:
- Mejor vuelta: 41.427 → 39.489 = mejora acumulada de 1.938 s (4.68%).
- Media útil V2–V4: 41.655 → 40.257 = mejora de 1.398 s (3.36%).
- Punta: 68 → 71 km/h = +3 km/h.
- Velocidad media: 59 → 61 km/h = +2 km/h.

Lectura:
- El Motor T2 produce un salto claramente perceptible respecto a T1 y stock.
- La mejora se manifiesta tanto en punta como en ritmo de vuelta, sin necesidad de frenar en esta tanda.
- V3 y V4 confirman una nueva meseta de rendimiento alrededor de 39.5 s.
- El escalón T1 → T2 es sensiblemente mayor que STOCK → T1; de momento es aceptable, pero debe vigilarse al comparar con T3 y T4 para evitar una curva demasiado explosiva.

### Próxima tanda
- Coche: VELOCE Flash
- Circuito: Karting Tenerife
- Pieza: Motor T3 / Racing
- Resto de familias: sin equipar
- Serie: 4 vueltas
