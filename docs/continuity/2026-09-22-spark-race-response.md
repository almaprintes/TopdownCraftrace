# HÉLIX Spark — respuesta de coche de carreras

Fecha: 22/09/2026
Versión: DEV 1.1.168

## Decisión de conducción

La curva de DEV 1.1.167 resolvía la discontinuidad de retención, pero su respuesta `0.30` hacía que Spark se sintiese como un turismo: tardaba unos 14,8 s en alcanzar los 84 km/h. Esa configuración queda guardada en `src/game/cars/longitudinalProfiles.js` como `TOURING` para futuros coches de calle o turismos.

Spark es un coche de carreras de iniciación. DEV 1.1.168 utiliza `RACE_STARTER`, con respuesta `0.60`. El perfil conserva la relación entre empuje y drag, por lo que mantiene la punta stock real de unos 84 km/h, pero construye velocidad con mucha más energía.

## Perfiles reutilizables

| Perfil | Respuesta | Uso previsto |
| --- | ---: | --- |
| `TOURING` | 0,30 | Turismo con masa e inercias perceptibles |
| `RACE_STARTER` | 0,60 | Coche de carreras accesible y rápido |

Ambos mantienen la transición continua de retención entre 12 y 45 km/h. Los demás coches no reciben ninguno de estos perfiles y conservan sus parámetros anteriores.

## Resultado Spark stock a 60 Hz

La simulación lee el mismo `public/community/car-overrides.json` utilizado por `BootScene`.

| Medida | TOURING 0,30 | RACE_STARTER 0,60 |
| --- | ---: | ---: |
| 0–15 km/h | 0,67 s | 0,33 s |
| 0–45 km/h | 2,48 s | 1,23 s |
| 0–80 km/h | 8,85 s | 4,45 s |
| 0–84 km/h | 14,77 s | 7,60 s |
| 45–15 km/h sin gas | 4,02 s | 2,43 s |
| 15–0,5 km/h sin gas | 3,70 s | 2,83 s |
| Punta sostenible | 84,58 km/h | 84,54 km/h |

## Respuesta de motor

Gas completo en parado tiene ahora un objetivo aproximado de 4.200 RPM. Esto hace audible una subida clara sin saltar directamente al corte. Al empezar a moverse, la velocidad real sigue determinando la progresión principal y el último sample se alcanza cerca de la punta sostenible.

## Prueba manual

1. Acelerar a fondo parado durante las luces: debe subir con decisión, sin tocar redline.
2. Mantener gas desde la salida: 45 km/h debe llegar con rapidez, pero las capas superiores deben seguir apareciendo progresivamente hasta 84 km/h.
3. Soltar gas a 45 km/h y comprobar que 45–15 y 15–0 forman una única caída continua.
4. Confirmar que la frenada con pedal conserva su fuerza anterior.
