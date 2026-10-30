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


## Cuarta optimización: instantáneas públicas sin escrituras inútiles (30/10/2026)
- Migración versionada: `20261030_027_race_control_skip_unchanged_public_snapshot.sql`.
- La tarea `tdr-web-rankings-refresh` **continúa cada 5 minutos** (288 comprobaciones/día). Se consultan solo los mejores tiempos de los **13 circuitos vigentes**; no hay más consultas por jugador ni triggers adicionales.
- Como `generated_at` cambia en cada comprobación, la comparación excluye expresamente esa fecha. Se compara únicamente el JSON `tracks` y `version` contra la instantánea ya publicada, utilizando `ON CONFLICT DO UPDATE ... WHERE ... IS DISTINCT FROM ...`.
- **Si no cambia el contenido, la tabla pública no se reescribe**, y no se actualiza `tdr_web_private.refresh_daily` (este contador pasa a registrar solo publicaciones con cambios reales). `generated_at` pasa a ser la **última modificación real**, no la última comprobación. El historial técnico de comprobaciones sigue en pg_cron.
- Verificación directa no destructiva: ejecutar la función sin cambios mantuvo el mismo `xmin`, la misma huella SHA-256 de JSON y el mismo `generated_at`. Es una constatación real de que no hubo actualización de la fila.
- Beneficio máximo en periodos sin cambios: se evitan hasta **288 reescrituras diarias del resumen público** (menos las actualizaciones legítimas). La tarea cron sigue leyendo las clasificaciones y registrando sus propias ejecuciones: ahorro de escrituras, **no ahorro de todas las consultas**.
- Se mantienen intactos jugadores, récords, fantasmas, circuito, orden, tipo de respuesta y cadencia de actualización. No exige otra versión instalada del juego.
- Prueba estática de regresión integrada en `scripts/online-snapshot-recovery-smoke.mjs`: 13 circuitos y orden iguales al original, comparación semántica de contenidos, versión y condición de no reescritura.

**Siguiente hipótesis a medir:** entrega de los resúmenes públicos con caché HTTP/CDN y política de revalidación para reducir lecturas de Supabase por visitante. Elegir la solución según egress, no añadir un proxy que pueda resultar más caro que la lectura actual.


## Quinta optimización: cron de rankings públicos cada hora en punto (30/10/2026)

- El trabajo `tdr-web-rankings-refresh` pasa de `*/5 * * * *` a **`0 * * * *`**: 24 comprobaciones/día frente a 288 (reducción de **91,7 %**), sin tocar la función de rankings autenticados que usan los jugadores dentro de Race Control.
- La marca `refresh_seconds` de la instantánea pública ahora declara **3.600 segundos**. La comparación de contenido incluye expresamente esa propiedad: se publicó un único cambio de metadatos y, en la ejecución inmediata posterior sin nuevos récords, el número de versión interno de la fila no cambió.
- Prueba en producción controlada: el digest de `tracks` siguió idéntico antes/después de cambiar el intervalo. Sin inserción ni eliminación de récords o fantasmas.
- La clasificación pública puede tardar hasta una hora en reflejar un nuevo récord; **esta latencia es deliberada**, para ahorrar consultas. El panel autenticado de Race Control mantiene sus consultas bajo demanda y no está sujeto a ese horario.
- Se mantienen la limpieza diaria del historial cron, la prevención de escrituras idénticas, las regiones y los circuitos actuales.
- Migración versionada: `supabase/migrations/20261030_028_race_control_hourly_public_rankings.sql`. La tarea y su intervalo se verificaron directamente en `cron.job`; no hay nuevos servicios ni coste por jugador.


## Sexta optimización: 10 políticas RLS con InitPlan estable (30/10/2026)

**Motivo:** Supabase Performance Advisor informó de 10 advertencias `auth_rls_initplan` (3 en `profiles`, 3 en `track_records` y 4 en `tdr_public_notices`). En estas políticas, `auth.uid()` y `auth.jwt()` se ejecutaban potencialmente por cada fila.

**Intervención:** Migración `supabase/migrations/20261030_029_rls_initplan_efficiency.sql`. Cada comprobación pasa a `(select auth.uid())` o `(select auth.jwt())`: PostgreSQL puede evaluarla una vez por consulta. Se mantienen los predicados de propiedad `user_id`, los límites temporales de publicación, los `TO authenticated`/`TO anon`, las restricciones `USING` y `WITH CHECK`, y la autorización de staff basada exclusivamente en `app_metadata.tdr_staff`. No se crean funciones `SECURITY DEFINER` ni se amplían GRANTs.

**Control de cambios:** La transacción de migración compara las diez definiciones originales, roles, comandos y tipos de política con `pg_policies`. Si alguna ha cambiado, aborta sin aplicar ninguna modificación. Todo se aplica mediante `ALTER POLICY`, conservando nombres, roles y operaciones.

**Verificación:**
- Auditor de rendimiento repetido tras el cambio: **0 advertencias `auth_rls_initplan`**, frente a 10 antes.
- Pruebas SQL de solo lectura con transacciones revertidas (`SET LOCAL ROLE` y JWT simulado): anónimo **no puede ver borrador**, cuenta autenticada sin staff **no puede verlo**, administrador **sí puede verlo**.
- Datos intactos: **15 récords, 15 fantasmas, 26 perfiles, 2 copias de progreso y 1 borrador no publicado**.
- Prueba automatizada sin red: `scripts/rls-initplan-efficiency-smoke.mjs` / `npm run check:rls-initplan`, integrada en el prebuild, exige exactamente las 10 políticas revisadas y prohíbe cambios en los permisos y datos.

**Avisos informativos que permanecen (no confundir con errores):** las dos tablas históricas de respaldo no tienen clave primaria y un índice de país figura como no utilizado. No tocar respaldos ni eliminar índices potencialmente necesarios con tan pocos usuarios: medir antes y justificar cualquier operación.

**Límite de evidencia:** la desaparición de los avisos y las pruebas de permisos acreditan la corrección estructural; el ahorro real de CPU con 100.000 jugadores sigue pendiente de una prueba de carga sintética aislada.


## Séptima optimización: cerrar circuitos inventados en las RPC de publicación (30/10/2026)

### Hallazgo de seguridad y coste
Las dos funciones `SECURITY DEFINER` `submit_track_record` y `submit_track_record_with_ghost` autenticaban por `auth.uid()`, pero aceptaban cualquier nombre de circuito de 1 a 80 caracteres. Una cuenta falsificada podía enviar innumerables IDs de circuito diferentes, generando filas sin límite y hasta 128 KiB de fantasma por fila: crecimiento de almacenamiento y coste de escritura no justificados.

### Corrección
Migración `20261030_031_official_track_publication_guard.sql`.
- Catálogo **inmutable** `tdr_web_private.is_current_race_control_track(text)` con los 13 IDs actuales ya utilizados por la instantánea pública.
- Comprueba ambos métodos de publicación antes de insertar/actualizar; si el ID no es oficial: `Invalid track_id`. No crea tablas, índices, ciclos cron, conexiones ni consultas SQL adicionales. Tampoco cambia los límites de tamaño ni la lógica de recompensa.
- Las funciones siguen usando únicamente el UUID del JWT, permanecen bajo `authenticated` y no dan acceso a `anon`. El ayudante queda en esquema privado, sin permiso de ejecución para roles públicos.
- La migración comprueba las huellas de los cuerpos originales para no modificar inadvertidamente funciones editadas en paralelo. Ningún récord, fantasma o perfil existente se altera.

### Norma indispensable para nuevas pistas
**Todo circuito nuevo debe registrarse en el catálogo oficial del juego, el resumen público y la función privada de ID permitido antes de que puedan publicarse sus récords.** Para un nuevo `@gN-AAAAMMDD` se debe añadir la nueva edición; la antigua puede conservarse en respaldos. Acompañar el cambio de pruebas de regresión y actualización de documentación.

### Riesgos que siguen pendientes
- El cliente todavía proporciona `best_time_ms` y el contenido del fantasma; esta protección evita crear circuitos ficticios, pero **no es un sistema antitrampas**. Hace falta homologación o validación independiente antes de declarar inviolables los récords.
- La identidad anónima de Supabase es técnicamente un rol `authenticated` si inicia sesión anónima; revisar el flujo de invitado antes de rechazarla, para no romper partidas de producción.
- Las 13 advertencias de `authenticated_security_definer_function_executable` no implican automáticamente 13 vulnerabilidades. Los endpoints inspeccionados están sujetos al JWT y son funcionalmente necesarios para lectura o escritura controlada. No revocar permisos genéricamente.
- La carga de 100.000 usuarios aún requiere pruebas sintéticas externas.

