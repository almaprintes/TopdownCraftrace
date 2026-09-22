# HÉLIX Spark — respuesta longitudinal progresiva

Fecha: 22/09/2026
Versión: DEV 1.1.167

Estado posterior: esta curva se conserva desde DEV 1.1.168 como perfil reutilizable `LONGITUDINAL_PROFILES.TOURING`. Spark pasó al perfil de carreras documentado en `2026-09-22-spark-race-response.md`.

## Diagnóstico medido

La configuración publicada de Spark procede de `public/community/car-overrides.json`: `maxFwd: 650`, `accel: 434` y `linearDrag: 0.01122`. Con el multiplicador de fábrica y la conversión canónica de 0,185 km/h por px/s, su punta sostenible es 84,39 km/h.

La dinámica previa combinaba mucho empuje con mucho drag. Esa combinación alcanzaba la punta correcta casi inmediatamente: Spark necesitaba unos 0,73 s para alcanzar 45 km/h y unos 4,77 s para llegar a 84 km/h.

Después, `RaceCoastInertiaScene` compensaba casi todo el drag por encima de 35 km/h y retiraba la compensación entre 35 y 15 km/h. El resultado reproducía la observación de dispositivo: unos 8,27 s para bajar de 45 a 15 km/h y solo 2,22 s desde 15 hasta prácticamente cero.

El audio amplificaba la sensación porque gas completo seleccionaba el objetivo de redline incluso a velocidad cero. La mezcla y los samples eran correctos; el objetivo de RPM no estaba siguiendo el desarrollo real de velocidad.

## Solución

El cambio está limitado a HÉLIX Spark.

- `longitudinalResponse: 0.30` escala empuje y drag conjuntamente. La relación entre ambos permanece igual, por lo que conserva los 84 km/h sostenibles, pero la velocidad necesita tiempo real para construirse.
- La retención se interpola en una banda amplia de 12 a 45 km/h.
- A velocidad media se conserva suficiente resistencia para que 45–15 no parezca una deriva infinita.
- A baja velocidad se mantiene una caída progresiva sin el escalón anterior.
- Freno normal, giro, agarre, superficies y velocidad máxima dura no cambian.
- Los coches sin estos parámetros reciben exactamente los valores anteriores.
- El objetivo del motor Spark usa la punta sostenible calculada. El gas parado eleva claramente el régimen sin saltar a redline; en movimiento, RPM y sample suben principalmente con la velocidad real.

## Resultado de la simulación a 60 Hz

| Medida | DEV 1.1.166 | DEV 1.1.167 |
| --- | ---: | ---: |
| 0–15 km/h | 0,20 s | 0,67 s |
| 0–45 km/h | 0,73 s | 2,48 s |
| 0–84 km/h | 4,77 s | 14,77 s |
| 84–45 km/h sin gas | 13,60 s | 3,23 s |
| 45–15 km/h sin gas | 8,27 s | 4,02 s |
| 15–0,5 km/h sin gas | 2,22 s | 3,70 s |
| Punta sostenible | 84,39 km/h | 84,58 km/h |

`scripts/spark-longitudinal-smoke.mjs` reproduce estas ecuaciones, limita los rangos aceptables y comprueba que no reaparezca la discontinuidad alrededor de 15 km/h.

## Prueba manual

1. Salir desde parado con gas continuo y confirmar que 15, 45 y 55 km/h llegan de forma progresiva.
2. Soltar gas a unos 45 km/h y comprobar una caída continua hasta detenerse, sin quedarse flotando ni frenarse de golpe al cruzar 15.
3. Confirmar que el sonido sube de sample siguiendo esa progresión y que no alcanza el tono máximo nada más pisar.
4. Repetir con otro coche para confirmar que su respuesta longitudinal no ha cambiado.
