# Race Control · escalabilidad hacia 100.000 jugadores — DEV 1.4.9

## Alcance y seguridad
Esta primera optimización no cambia los tiempos, fantasmas, usuarios ni partidas almacenadas. Sustituye el cálculo de `public.get_track_leaderboard` sin cambiar su firma ni la salida de `get_race_control_snapshot`, y añade una RPC que lee únicamente el récord del piloto autenticado.

## Mejoras
- **Consulta previa al anuncio:** `get_my_track_personal_best(p_track_id)` usa el UUID verificado del JWT, no acepta UUID de terceros y aprovecha la clave única existente `track_records(user_id,track_id)`. Devuelve únicamente un entero (o NULL). Se mantiene cerrada la lectura directa de la tabla a clientes.
- **Rankings:** Top 25 mediante `FETCH FIRST 25 ROWS WITH TIES`; se mantienen todos los empates de puesto 25. Los rivales del piloto se calculan a partir de ventanas cercanas, recontando rango solo por tiempo distinto, no creando una tabla temporal completa.
- **Cuatro ámbitos:** global, continente, país y región sin cambiar reglas ni filtros. Los puestos empatados mantienen el mismo `RANK()` y la sección `nearby` mantiene los ±10 puestos y solo posiciones superiores a 25.
- **Sin tablas ni índices nuevos:** índices actuales `track_records_pkey` y `track_records_track_time_idx`.

## Pruebas
- Migración de PostgreSQL aplicada el 30/10/2026 con éxito.
- En datos reales, una comparación de 40 combinaciones circuito/ámbito (para un piloto) arrojó **57 filas idénticas de 57**, cero omitidas y cero inesperadas. No es una prueba de carga.
- Comprobados permisos EXECUTE: `anon=false`, `authenticated=true` para ambas funciones.
- Comprobados conteos: 15 récords, 15 fantasmas y 2 copias de progreso inalterados.
- Contratos automatizados: `scripts/online-snapshot-recovery-smoke.mjs` se ejecuta en `npm run prebuild`.

## Límites y pasos siguientes
- La optimización reduce trabajo por consulta, pero no permite garantizar capacidad para 100.000 usuarios sin una carga sintética externa y métricas (latencia p95, CPU, egress, memoria y bloqueos).
- El requisito de exactitud de empates grandes aún puede producir respuestas extensas.
- Evaluar la planificación de consultas y costes para ámbitos geográficos con cientos de miles de registros; añadir índices solo si las mediciones justifican su mantenimiento.
- Considerar instantáneas de leaderboard para las clasificaciones globales y recomputación por eventos, evitando trabajo repetido.
- No publicar en Google Play sin autorización.
