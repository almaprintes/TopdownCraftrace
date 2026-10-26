# DEV 1.3.40 — Cobro de temporada sin duplicados, incluso sin espacio en iPhone

26/10/2026. Reporte del usuario con capturas: etapa 10/14 Coleccionista (20/20), reclama disco metálico x4, animación «Reward Claimed» pero sigue 9/14 y puede repetir indefinidamente.

## Causa encontrada en código
En `raceEvents.claimCurrentRaceEvent`, `saveGarage(garage)` persistía los 4 discos, luego `saveState(key,state)` tenía un `catch{}` que tragaba errores (cuota localStorage). Se retornaba `ok:true` y se mostraba celebración aunque `tdr2:seasonInduction:v1` conservase el índice 9. No hay recibo retroactivo que distinga todos los cobros previos; no retirar materiales existentes.

## Corrección
El garaje contiene un `seasonClaimReceipts` por familia con la última misión reclamada, índice y baseline. Se actualiza en la MISMA cadena JSON que las monedas/materiales, una única escritura `localStorage` atómica. `loadState` recupera el progreso si el índice viejo está detrás del recibo. Repetir el clic ya no vuelve a pagar. El estado separado sigue escribiéndose cuando hay espacio; su error ya no crea pérdida de avance.

Si el almacenamiento del garaje no permite escribir, se libera SOLO índice de Records materializado, caché de rankings online y reporte diagnóstico — elementos regenerables; jamás borramos fantasma exacto, historial de vueltas, cuenta, identidad o progresos. Si ni así funciona, se informa claramente y no se presenta la falsa celebración. Los desbloqueos de coche se verifican antes del recibo.

## Alcance
Inducción y Crown Cuper; DEV 1.3.40, solo `main`; sin cambios en Supabase, coches, físicas, anuncios o circuitos. Los materiales acumulados por reclamos repetidos anteriores no se recuperan retroactivamente y no se deduce cuántos fueron.

## Verificación
`npm run check:season-claim-atomic` integrado en prebuild. Comprobar en iPhone 9/14 → 10/14 tras reclamar una sola vez, tarjeta 10 marcada y tarjeta 11 como actual, sin duplicar los 4 discos. Recargar navegador y comprobar persistencia.
