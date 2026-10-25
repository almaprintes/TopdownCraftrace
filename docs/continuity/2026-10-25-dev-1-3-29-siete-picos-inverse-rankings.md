# DEV 1.3.29 — 7 Picos Inverso y clasificaciones

25/10/2026. Rama main, código preparado para la siguiente publicación Android; ninguna APK/AAB ni actualización de Play solicitada.

**Variantes:** `siete-picos` (7 PICOS) y `siete-picos-inverso` (7 PICOS INVERSO). La segunda reutiliza fotografía WebP 4344×3258 y 6+6 tiles iPhone, colisiones del mismo `.environment.json` (45+42 nodos), capas/copa, meta y superficie. `makeInvertedClosedTrack` invierte centerline de carrera, normal de meta, dos checkpoints y su orden, y calcula salida segura antes de meta. No modifica el original ni le cambia los mejores tiempos.

**Selección:** una tarjeta de 7 Picos, control normal/inverso heredado de los demás circuitos. Ambos IDs se integran en `PUBLISHED_TRACK_IDS` y `STARTER_TRACK_IDS`, visibles en Estadísticas y Race Control online (global/continente/país/región). Se retira su excepción de circuito DEV oculto; se mantiene publicado en la web DEV y elegible para la PRÓXIMA versión Android, sin generar release.

**Online:** los RPC `submit_track_record_with_ghost` y `get_race_control_snapshot` ya aceptaban IDs textuales de hasta 80 caracteres, sin whitelist ni cambios de tabla. Claves separadas `track_id` = los dos IDs, récords/fantasmas separados. La función privada `refresh_leaderboards` que alimenta el snapshot público global añade ambos como destinos por defecto para que estén incluso con 0 tiempos. Migración `supabase/migrations/20261025_019_siete_picos_rankings.sql`, conserva IDs/registros previos y refresca los dos nuevos tableros vacíos. No se publican tiempos inventados.

**QA:** scripts `siete-picos-dev-visibility-smoke.mjs`, `siete-picos-replacement-smoke.mjs` y `siete-picos-inverse-rankings-smoke.mjs`; revisar físicamente en DEV el sentido, dos CP y meta, clasificaciones separadas, ausencia de duplicación de colisiones, y publicación rewarded después de obtener vuelta válida.
