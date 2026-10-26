# Race Control — fantasma para todas las mejores vueltas clasificadas

**Decisión del propietario:** 26 de octubre de 2026. Documento de arquitectura; no altera producción ni el backend.

## Intención
Que **cada piloto que figure en el ranking de un circuito y sentido tenga un único récord personal con una grabación exacta**. No confundirlo con conservar cada vuelta de entrenamiento. No borrar la posibilidad de ver la repetición por caer fuera de top 10 / top 100.

Ejemplo: jugador en puesto 45.455 de 50.000; ofrecer rivales 0,2 / 0,5 / 1,0 segundos más rápidos; podrían ocupar el puesto 45.200, 45.454 o cualquier otro. El puesto sirve para orientar, pero la **diferencia de tiempo** determina el rival relevante.

## Estado auditado
- Supabase proyecto TopDown RACE (26/10/2026): **38 registros** en `track_records`, **38 `ghost_payload` presentes**; 15 usuarios, 10 circuitos. `ghost_size_bytes` promedio **2.355 bytes**, máximo 4.996 bytes.
- `track_records` tiene PK `(user_id,track_id)` e índice B-tree `(track_id,best_time_ms)`: ya es viable localizar candidatos por circuito y tiempo.
- `get_track_leaderboard` expone **top 25 + ±10 puestos respecto al propio**, no todo el ranking ni selección por tiempos.
- `RaceTop10ReplayScene` almacena top 10 de **historial local**, y la copia del PB ocurre dentro de su bloque `qualifies`. Debe auditarse para que grabar un PB no dependa del cupo top-10 ni de registros antiguos, del modo de carrera o de que haya espacio de localStorage; evitar sobreescribir PB si la grabación no se guarda.
- En DEV 1.3.35 los tiempos sin replay **sí pueden publicarse** voluntariamente tras anuncio, con flag `ghost_available=false`. Es una excepción aceptada previamente para no bloquear récords reales; **no se modifica ahora sin autorización**.

## Contrato futuro
1. **Grabación automática ligera** en todo circuito/sentido y modo clasificable, desde primera hasta última vuelta válida. Conservar el **mejor replay de cada jugador por circuito/sentido**, sustituyéndolo al mejorar su PB y conservando a salvo la marca hasta confirmar el reemplazo. Validar id circuito+sentido, coche, lapMs, muestras y fingerprint de geometría.
2. **Publicación fiable y verificable:** asociar tiempo y ghost exactos de forma atómica por `record_ref` en backend; reintentar subidas fallidas idempotentemente; estado explícito `replay pendiente` sin borrar marca. Mantener la posibilidad histórica de publicación solo tiempo mientras se decide política definitiva para todas las nuevas marcas.
3. **Rival inteligente:** nueva consulta parametrizada autorizada (servidor) que parte del PB del jugador, indexa `track_id,best_time_ms` y devuelve un número acotado de pilotos por **delta en milisegundos**, filtrando `ghost_payload is not null` y misma revisión de circuito. Primero mejores ligeramente más rápidos, luego lentos como alternativa. No cargar 50.000 filas ni 50.000 fantasmas en teléfono, nunca hacer sondeo por frame.
4. **Interfaz Race Control:** pestaña/selector `RIVALES CERCANOS`, con tiempo, puesto, delta (+0,2 s ventaja rival), coche, bandera de replay válido y botón **VS**. Preajustes de búsqueda: 0–0,3 s, 0,3–1,0 s, 1–3 s; fallback ampliando intervalo con mensaje si faltan oponentes. Navegación/paginación por cursor sin `OFFSET` profundo.
5. **Reproducción bajo demanda:** descargar solo los 1–3 fantasmas que el jugador seleccione; caché corta de sesión, tamaño máximo y validación de `trackId`, sentido, lapMs y revisión física del trazado. No ejecutar grabaciones obsoletas tras modificar un circuito; conservar el tiempo histórico y marcar replay pendiente/obsoleto.
6. **Coste y escala:** media actual 2.355 bytes × 50.000 ≈ **117,75 MB de cargas compactas**, más índices/metadatos/overhead. Medir también CPU, latencia y tráfico; evitar descarga masiva. A 1 millón de récords por circuito, ~2,355 GB de cargas a igual media, antes de copias y overhead.
7. **Pruebas antes de prometer garantía:** casos de modo normal e inverso, PB nuevo fuera de top10 histórico, almacenamiento lleno, cierre de PWA antes de terminar la escritura, pérdida de red, cambios de geometría, replay de coche distinto, 50.000 filas simuladas e identificación consistente bajo cuentas múltiples; las marcas sin ghost existentes no deben desaparecer.

**Estado:** requisito y plan documentados. No se ha modificado SQL ni código de ejecución; es necesaria una implementación y verificación por iteraciones antes de afirmar 100 % de cobertura.
