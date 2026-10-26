# DEV 1.3.41 — separar rankings del trazado anterior

**26/10/2026**, rama main, DEV.

## Incidencia
El usuario consigue PB local 0:11.467 en el Atlántico actual, mientras que Supabase tenía 0:09.054 desde el 18 de septiembre en el trazado retirado. Las RPC usan `track_id` como identidad competitiva, por eso bloqueaban el nuevo tiempo aunque ambas pistas fueran físicamente distintas.

## Solución sin borrado
El nombre físico y de interfaz queda igual. El identificador de **competición online** cambia para los dos circuitos que cuentan con marcas antiguas antes de rehacerse: `circuito-atlantico@g2-20261023` y `santa-cruz@g2-20261023`. Los registros y fantasmas históricos permanecen íntegros bajo `circuito-atlantico` y `santa-cruz`. Las inversas siguen inalteradas porque no hay prueba de marcas anteriores al rediseño; los demás circuitos tampoco se modifican.

La integración incluye envío con/sin ghost, preflight no-ad, ranking, rivales de tiempo, insignia, caché del ranking y acceso al fantasma mediante la edición autenticada del servidor. El binario no codifica la revisión: para una fila respaldada por id online de edición actual se estampa en memoria la huella del circuito y se valida, mientras que las filas antiguas siguen con su heurística de compatibilidad.

No requiere migración SQL ni eliminar datos. Las RPC ya usan el campo `track_id` como índice y admiten la longitud del nuevo id. La clasificación actual comienza vacía hasta la primera publicación y las instantáneas anónimas se actualizarán en su próxima ejecución. Al redibujar cualquier circuito debe crearse otra edición, sin reutilizar las antiguas.

## Verificación
`npm run check:race-control-track-editions` integrada en prebuild. En iPhone: desde Race Control debe permitirse solicitar publicación del 0:11.467 local sin comparar contra 0:09.054 anterior. Anuncio solo tras autorización del usuario y verificación del premio, y fantasma solo si se guarda la toma exacta. El archivo histórico aún no tiene panel visible de consulta; sigue en Supabase.
