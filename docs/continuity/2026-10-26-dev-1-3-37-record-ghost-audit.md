# DEV 1.3.37 — auditoría real de récords, filtros y vueltas fantasma

Fecha: 26/10/2026. GitHub `almaprintes/TopdownCraftrace`, rama `main`. Alcance: DEV PWA; no modificar Google Play ni APK/AAB ni tiempos de Supabase.

## Evidencias verificadas

Capturas del propietario (Circuito Atlántico, 26/10):
- PB mostrado en Race Control: **0:12.749**.
- Online GLOBAL: **JUANFRIKI 0:08.759**, **JUANFRIKAZO_DEV 0:09.054**.
- Informe de tanda: 0:12.749, mejora de 8.335 s, por lo que el PB local previo era **0:21.084**.
- Emparejamiento con filtro ≤10 s devuelve CaMByMaN 0:16.201 con **−4.883 s** y JOSELU4 0:12.781 con **−8.303 s**. Ambos deltas son exactamente `21.084 − tiempo del rival`: el filtro tomaba un PB viejo, no el 12.749 visible. El filtro ≤3 s aparecía vacío aunque desde 12.749 debería encontrar al menos 11.678, 11.501, 11.289.

Consulta SOLO LECTURA directamente a Supabase West EU `public.track_records` y `public.profiles`:
- 38 récords totales, 38 con `ghost_payload`, de 10 IDs de circuito.
- Atlántico: 12 marcas con fantasma, 11 anteriores al 23/10. `JUANFRIKAZO_DEV` 9.054 (18/09/2026), `JUANFRIKI` 8.759 (10/10/2026), JOSELU4 12.781 (24/10/2026).
- Santa Cruz: 7 marcas, todas anteriores al 23/10.
- Migración local de 23/10 `archiveRetiredTrackRecords.js` guarda en IndexedDB y reinicia **solo las cuatro identidades locales** Santa Cruz/Atlántico, normales e inversos, por autorización expresa. **NO** reinicia Supabase. Por eso un PB local nuevo puede ser más lento que otro online antiguo de la misma cuenta.

## Causas y riesgos confirmados

1. **Dos fuentes de verdad local**: héroe con `getPersonalCircuitRecords()` (reconstruye `ttBest`), pero los rivales/`_getSelectedRecord` leían directamente la copia `tdr2:raceRecords:v1` guardada. En una reconstrucción no persistida (por ejemplo, cuota localStorage), esa copia puede quedar atrasada. La contradicción observada es consistente con este mecanismo. **No se puede demostrar el fallo concreto de escritura en el móvil** sin inspeccionar su almacenamiento; se corrige la divergencia estructural.
2. **Éxito aparente de publicación sin mejora**: las RPC `submit_track_record` y `submit_track_record_with_ghost` respetan el mínimo histórico y devuelven `improved=false` para un intento más lento. El cliente marcaba `published=true` incluso con `improved=false`. Resultado: «Publicado» y «Ya tenías una marca mejor» simultáneos; en servidor nunca cambió el récord. Además se ofrecía anuncio sin revisar primero la marca online de ese UUID.
3. **Versiones de trazado mezcladas online**: Atlántico cambió geometría a 70 %; Santa Cruz fue redibujado. `track_records` guarda `track_id` pero ninguna `geometry_revision`. Los tiempos viejos y nuevos compiten en un único ranking. Un ghost puede contener posiciones X/Y absolutas del mapa anterior. La validación geométrica del cliente solo distingue ciertos casos antiguos y no demuestra compatibilidad universal.
4. **Rediseño incompleto**: en 1.3.36 se añadió únicamente el panel cercano, no el menú integral inspirado en la imagen de referencia. No debe presentarse como una implementación fiel de esa referencia.

## Correcciones DEV 1.3.37 realizadas

- `StatsBroadcastReplayScene._getSelectedRecord` utiliza `getCircuitRecord(trackId)`, la misma fuente autoritativa de `ttBest` que el héroe. Evita que el filtro tome un snapshot derivado obsoleto. Cache de consultas de rivales sigue acotada a 90 segundos y por ID+tiempo+rango; los cambios de PB usan clave nueva.
- Race Control etiqueta explícitamente **PERSONAL BEST · LOCAL** y muestra **ONLINE <tiempo>** solo si en el snapshot del ámbito seleccionado hay fila `is_me`. No supone identidad según el nick visible.
- `getMyRaceControlRecord` consulta `get_race_control_snapshot` autenticado y busca fila `global / is_me=true`, antes del anuncio. Ambas pantallas de publicación bloquean intentos que no mejoran el récord online y explican que NO se ha solicitado anuncio. Conservan el PB local.
- Las dos rutas revisan `row.improved===true` antes de mostrar «Publicado» o registrar `published`; una carrera simultánea/no-op se presenta como marca online conservada, no como nueva publicación. La comprobación previa no puede eliminar al 100 % la carrera entre dispositivos durante el anuncio: la última respuesta del servidor sigue siendo la autoridad.
- Decodificación del replay online comprueba `ghostReplayCompatibility` con la geometría actual; una grabación incompatible no se reproduce, incluso en VS de ranking general. Esto no equivale a sanear los registros históricos.
- Regresión nueva `npm run check:race-control-publication-consistency` reproduce local 21.084 -> 12.749, online 9.054, snapshot derivado que no se pudo actualizar, orden preflight/anuncio y control del resultado servidor.

## Pendientes P0/P1 para competencia justa y garantía de fantasmas

- **P0 Backend generacional**: diseñar tabla de versiones de geometría con huella estable por trazado/sentido; conservar históricos en tabla/archive y crear clasificación ACTUAL separada. Definir migración verificable antes de tocar los 38 récords: no borrar ni reemplazar sin copia auditada. Los nuevos PB actuales deben poder superar a los de su propia generación, no ser bloqueados por tiempos obsoletos.
- **P0 Integridad extremo a extremo**: persistir firma de geometría, coche, tiempo y payload en la misma actualización atómica; verificar en servidor al recibir, no solo en el teléfono. Garantizar que REPLAY/VS se ofrece solo tras verificar compatibilidad **antes del anuncio**. Definir estado «REPLAY PENDIENTE» para tiempos sin fantasma en lugar de prometer cobertura total.
- **P1 Rankings grandes**: comparar candidatos sobre **PB online de generación actual** o referencia elegida explícitamente; soportar fallback al rival más cercano más lento y contar deltas con signo y dirección claros; datos paginados por tiempo; cachear por usuario y generación para evitar contaminar sesiones de cuentas distintas.
- **P1 Diseño**: reconstruir el layout COMPLETO según referencia original de tarjetas grandes, hero fotográfico, controles jerarquizados y enfrentamientos. La pantalla añadida en 1.3.36 NO satisface ese objetivo todavía. Validar iPhone horizontal antes de darla por cerrada.
- **P1 Publicación/ad**: revisar anti-abuso del desbloqueo de fantasmas: el control de visionado rewarded está actualmente en el cliente; se necesita validación verificable lado servidor si los anuncios son requisito contractual real.

## Qué NO se ha hecho

No se alteraron `public.track_records`, perfiles, fantasmas antiguos, RLS, fotos, pistas, controles, físicas ni cuentas. No se prometen 100 % de replays válidos, corrección global de rankings históricos o rediseño visual completo con esta versión. Verificar manualmente Race Control, filtros 0,3/1/3/10, publicación con/sin ghost y login en el iPhone y Android.
