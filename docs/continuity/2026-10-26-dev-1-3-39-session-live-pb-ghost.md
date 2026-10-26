# DEV 1.3.39 — Vuelta PB exacta accesible en el informe

26/10/2026 · rama `main` · solo DEV.

## Observación
Tras una vuelta personal de 0:11.485 (anterior 0:12.749), el informe muestra el diálogo «No existe una repetición exacta». No demuestra por sí solo si WebKit agotó espacio, falló la persistencia o rechazó la grabación por compatibilidad: son causas por separar.

## Corrección
`RaceTop10ReplayScene` mantiene la vuelta personal exacta en memoria durante la sesión antes de cualquier intento de localStorage. La etiquetamos con `ghostGeometryRevision` obtenido de la pista cargada, para que el validador no confunda la toma actual de Atlántico/Santa Cruz con un fantasma histórico sin revisión. El informe consulta esa misma grabación viva por circuito, coche, tiempo ±2 ms y muestras finitas; si no existe sigue buscando registros persistidos, sin mezclar vueltas anteriores.

No se alteran marcas, usuarios, Supabase, anuncios, físicas ni circuitos. El consentimiento excepcional de publicación sin replay sigue existiendo para fallos reales sin muestras. Esta modificación mejora el camino de publicación desde el informe, no demuestra que el PB anterior pueda recuperarse después de cerrar la escena si el navegador perdió los datos.

## Validación
`scripts/session-live-pb-replay-smoke.mjs` comprueba PB 11.485 con localStorage inaccesible, rechazo de 12.749, coche/circuito ajeno, puntos inválidos y revision de geometría. Integrado en prebuild. Pendiente prueba real en iPhone con marca nueva y confirmación de replay/VS en ranking online.
