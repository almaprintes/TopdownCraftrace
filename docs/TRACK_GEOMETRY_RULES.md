# Topdown Craftrace — reglas de geometría de pista

Este documento fija el método que debe reutilizarse en TODOS los circuitos futuros.

## Problema que resolvemos

Las curvas muy cerradas y horquillas pueden hacer que un borde paralelo tradicional (left/right offset) se auto-cruce, forme cúspides, lazos, islas o puntas. El asfalto puede ocultarlo visualmente, pero una línea de arcén real lo delata.

Por tanto, `geom.left` y `geom.right` NO deben tratarse como una frontera global siempre válida de la carretera.

## Base robusta que queda aprobada

1. La centerline se suaviza con Catmull-Rom centrípeta.
2. La centerline se densifica con muestreo adaptativo: más nodos en curvas fuertes, menos en rectas.
3. La superficie visual del asfalto se interpreta como una carretera barrida a lo largo de esa centerline densa. Así una horquilla puede solaparse consigo misma sin crear agujeros o islas visibles.
4. Las consultas de colisión/superficie se mantienen ligeras: un cuadrilátero por tramo. NO volver a meter polígonos circulares/joins de muchos lados en cada nodo dentro de la rejilla de colisión, porque en móvil provocó lag progresivo muy fuerte.
5. La franja de tierra puede dibujarse como un stroke ancho bajo el asfalto; la parte interior queda tapada y solo aparece el margen exterior.

## Línea de arcén real

Para una línea real no basta con conectar `left/right` globalmente.

Método aprobado:

- Calcular candidatos left/right desde la centerline densa usando la normal local.
- Para cada candidato, comprobar si ese punto queda enterrado dentro de otro tramo no vecino de la propia carretera.
- Si queda enterrado, no dibujarlo.
- Al pasar de visible a oculto, NO eliminar el segmento entero: recortar dentro del subsegmento y localizar la transición mediante búsqueda/interpolación. Esto evita pequeñas aberturas en la línea.

La implementación de referencia está en:

- `src/game/tracks/TrackBuilder.js`
- `src/game/scenes/RaceSurfaceLongitudinalScene.js`

Commits de referencia del proceso:

- `cf079a8` — densificación adaptativa de centerline
- `82755ee` — superficie visual robusta por barrido
- `c7aeb16` — restauración de colisión ligera para mantener rendimiento móvil
- `acb5dd6` — línea de arcén real con poda automática de solapamientos
- `c6dc9cc` — recorte subsegmento para cerrar pequeñas aberturas

## Regla crítica para futuros circuitos

Cada nuevo circuito debe pasar esta prueba ANTES de pulir arte o decoración:

1. Dibujar temporalmente una línea blanca continua y muy visible en ambos arcenes.
2. Dar una vuelta completa y revisar especialmente horquillas y curvas de radio pequeño.
3. No aceptar el circuito si aparecen lazos, cruces, cúspides, islas o aberturas claras.
4. Solo cuando la línea salga limpia, convertirla en el arcén visual definitivo y continuar con pianos, suciedad y decoración.

## Rendimiento móvil

Checkpoint de comportamiento esperado: varias vueltas completas sin tirones. Nunca sacrificar esta fluidez por geometría decorativa.

Evitar:

- miles de primitivas Graphics persistentes;
- joins circulares/polígonos adicionales dentro de la rejilla consultada cada frame;
- texturas o marcas direccionales que no sigan la orientación real de la pista;
- parches manuales por curva si pueden resolverse con la regla geométrica anterior.
