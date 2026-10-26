# DEV 1.3.38 — Reparación de juntas de foto en movimiento (26/10/2026)

## Incidencia
Captura aportada de carrera: raya negra vertical de 1–2 píxeles sobre la fotografía, intermitente con el desplazamiento de cámara del coche. El síntoma es coherente con una rendija de rasterización de dos sprites WebGL cuyas aristas se encuentran exactamente, especialmente en WebKit iPhone con texturas iOS al 65 % y escalado fraccional. **Hipótesis técnica basada en la captura/código; queda por confirmar visualmente en el dispositivo.**

## Corrección
Se añade `photoTileSeamlessBounds` y se usa una sola vez, al montar cada bloque fotográfico, para solapar **2 píxeles de foto original** únicamente en juntas internas. Ambos bloques cubren el límite incluso si la cámara queda entre píxeles. Se conservan posiciones y límites exteriores exactos, fuente WebP, escala de mundo, colisiones, físicas, render de coches, HUD, menús, cámaras y lógica de carrera. No añade texturas, capas, RAF, observadores ni trabajo por fotograma. Copias de foto para copas mantienen transformaciones idénticas a las nuevas.

## Verificaciones
`npm run check:photo-tile-seams`: empalmes horizontal/vertical, textura iPhone compacta, escala 2.5×, foto no dividida, límites originales y copas. Integrado en prebuild.

**Pendiente:** inspección visual en iPhone durante desplazamiento lento, rápido y con zoom dinámico, en Karting Tenerife y otro circuito fotográfico; compilación automatizada no prueba ausencia real de seams en WebKit.
