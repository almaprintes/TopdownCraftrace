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


## Segunda optimización: un solo contador de prefijo (DEV 1.4.9)
La primera versión calculaba la posición exacta para cada tiempo distinto de la ventana. La versión definitiva de `get_track_leaderboard` usa **un único recuento** de los récords anteriores al primer tiempo candidato y aplica `rank() over(order by best_time_ms)` exclusivamente dentro de esa ventana acotada. Reduce el número de recuentos de muchos a uno, conservando los empates y la posición real global.

Verificación posterior: comparativa de **40 combinaciones circuito/ámbito, 57 filas iguales, ninguna omitida ni añadida** respecto al cálculo completo original. El test real es de equivalencia funcional con los datos actuales, no una simulación de 100.000 usuarios.

## Tercera optimización: índice duplicado eliminado
`track_records_record_ref_idx` y `track_records_record_ref_unique` indexaban exactamente la misma columna `record_ref` con B-tree. El no único (16 KB actuales, 135 scans históricos) no pertenecía a una restricción; se retiró para evitar mantenerlo en cada inserción/actualización de récord. Se conserva el índice **único** `track_records_record_ref_unique` (16 KB), que sigue sirviendo todas las búsquedas por UUID y garantizando su unicidad. No se ha borrado ni cambiado ningún fantasma.

## Criterios de eficiencia permanentes
1. Primero medir la actividad y el coste por apertura, publicación, consulta y vuelta; después introducir cambios respaldados por pruebas.
2. Preferir consultas individuales por claves de índice existentes frente a rankings completos para obtener un solo valor.
3. No volver a leer en red un dato ya confirmado durante la misma operación; caché limitada y con invalidación explícita tras publicar.
4. Toda nueva escritura debe ser necesaria y estar limitada; conservar la atomicidad y el control de revisión de los guardados.
5. Mantener los índices mínimos necesarios: un índice extra ahorra lecturas pero cuesta espacio y escritura; jamás borrar índices de restricciones.
6. Probar empates, región desconocida, piloto sin récord, top 25 y ventanas ±10; proteger `auth.uid()`, las copias y los fantasmas.
7. Medir con perfiles sintéticos en entorno aislado antes de afirmar rendimiento para 100.000 jugadores.
8. No mezclar pruebas experimentales con datos de jugadores reales ni ejecutar pruebas de carga contra producción.

**Resultado**: progreso real sin compra de servicios, sin aumento de consultas por usuario y sin modificar datos existentes. La validación de escala 100k permanece pendiente de un entorno de carga sintética.
