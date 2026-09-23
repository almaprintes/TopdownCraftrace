# AVENIR Gripline — motor RPM y cierre de alcance para publicación

Fecha: 22/09/2026
Versión: DEV 1.1.169

## Audio del primer desbloqueable

El AVENIR Gripline deja de usar el motor procedural genérico. Declara el perfil `ENGINE_AUDIO_PROFILES.AVENIR_GRIPLINE`, que reutiliza los seis loops de carreras CC0 ya auditados y alojados localmente para Spark. No se añade descarga, permiso ni dependencia de red.

Gripline conserva una identidad diferente mediante su propia calibración:

- ralentí: 1.050 RPM;
- corte: 7.600 RPM;
- objetivo a fondo en parado: ~4.650 RPM;
- seis anclas propias: 1.050, 2.000, 3.150, 4.400, 5.800 y 7.500 RPM;
- subida y caída más rápidas que Spark;
- tono un 3,5 % más alto y ecualización con menos grave y más apertura en alta.

Las capas adyacentes comparten un único reloj WebAudio y usan crossfade de potencia constante. El régimen sigue la velocidad real sostenible del coche y el gas añade carga. La implementación no modifica input, física, progresión ni recompensas.

## Spark de iniciación

El perfil `RACE_STARTER` sube su respuesta de `0.60` a `0.72`. Empuje y resistencia escalan juntos, por lo que la punta sostenible permanece en ~84,5 km/h. La simulación stock a 60 Hz da:

| Medida | DEV 1.1.168 | DEV 1.1.169 |
| --- | ---: | ---: |
| 0–45 km/h | 1,23 s | 1,03 s |
| 0–80 km/h | 4,45 s | 3,72 s |
| 0–84 km/h | 7,60 s | 6,42 s |
| 45–15 km/h sin gas | 2,43 s | 2,10 s |
| 15–0,5 km/h sin gas | 2,83 s | 2,62 s |
| Punta sostenible | 84,54 km/h | 84,52 km/h |

La curva `TOURING` 0.30 sigue preservada para un futuro coche de calle.

## Alcance de salida recomendado

El juego ya tiene suficiente contenido para publicarse. El trabajo crítico es cerrar una candidata Android equivalente a producción y demostrar que los servicios y el recorrido principal funcionan juntos.

### Obligatorio antes del siguiente AAB

1. Construir la variante de producción sin Admin Hub, editores ni herramientas internas, manteniendo el juego y el acceso de jueces autorizado de forma segura.
2. Instalar la build release sobre la beta actual y confirmar que conserva progreso, identidad de paquete y firma.
3. Validar en Android real el bucle completo: arranque, carrera, botín, navegación, último circuito táctil, HUD Fantasma y rendimiento estable.
4. Validar rewarded ×2 real: anuncio, callback de recompensa, verificación SSV, claim idempotente, botín base ante fallo y recarga posterior.
5. Inyectar las variables públicas de Supabase en el build Android y comprobar Race Control online. No añadir compras ni nuevas funciones de backend ahora.
6. Conectar el acceso de privacidad de Google UMP, revisar Data Safety y dejar textos legales coherentes con anuncios, identificador anónimo y clasificaciones.
7. Preparar ficha, notas y respuestas de acceso a producción; solicitar acceso en cuanto finalicen los 14 días de prueba cerrada.

### Aplazado para después de publicar

- compras de monedas con dinero real;
- placements rewarded adicionales;
- nuevos modos, coches y contenido;
- ampliaciones de Supabase y antitrampas no críticas;
- perfiles de motor para el resto del garaje;
- refactorizaciones amplias y pulido que no resuelva un fallo de salida.

## Prueba manual de audio

1. Escuchar Spark en parado, salida y punta; debe responder con más energía sin alcanzar el corte inmediatamente.
2. Desbloquear/seleccionar Gripline y repetir la prueba; debe sonar más agudo, limpio y rápido que Spark.
3. Soltar gas en ambos coches y confirmar una caída continua sin saltos entre samples.
4. Cambiar entre Spark, Gripline y Vortex; Vortex debe conservar exactamente su perfil JEEP.
