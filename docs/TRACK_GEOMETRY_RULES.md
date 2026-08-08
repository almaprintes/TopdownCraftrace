# Topdown Craftrace — reglas de geometría de pista

Este documento fija el método que debe reutilizarse en TODOS los circuitos futuros.

## Problema que resolvemos

Las curvas muy cerradas y horquillas pueden hacer que un borde paralelo tradicional (`left/right offset`) se auto-cruce, forme cúspides, lazos, islas o puntas. El asfalto puede ocultarlo visualmente, pero una línea de arcén real lo delata.

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

## Pianos — sistema aprobado

Los pianos deben construirse SIEMPRE a partir del mismo sistema de borde ya validado. No crear una geometría paralela distinta ni volver a offsets globales sin poda.

### Dónde se dibujan

- En una primera pasada, solo en el INTERIOR de curvas reales y sostenidas.
- No decorar rectas ni cualquier cambio pequeño de dirección.
- Agrupar los nodos consecutivos que mantienen el mismo sentido de giro y superan el umbral de curvatura. Esa agrupación se considera UNA curva completa.
- Rechazar grupos demasiado cortos para evitar fragmentos rojos/blancos aislados.

### Cómo detectar la curva

- Calcular el giro local sobre la centerline densa usando puntos separados varios nodos a cada lado, no solo el vecino inmediato.
- Aplicar un umbral mínimo de curvatura para decidir si un tramo pertenece a una curva.
- Mantener el signo del giro durante todo el grupo: giro positivo y giro negativo representan lados opuestos.
- Si cambia el signo, termina el grupo anterior y comienza otro.

### Interior de la curva

- Si el giro es a un lado, usar como piano el borde interior correspondiente.
- El borde interior se obtiene de la misma normal local usada por el arcén.
- Antes de dibujar cualquier tramo, comprobar que el borde NO está enterrado dentro de otra parte no vecina de la carretera.
- Si está enterrado, se elimina ese tramo del piano.

### Forma del piano

El ancho NO debe ser constante.

Perfil aprobado:

- muy fino al comenzar la curva;
- aumenta progresivamente durante la entrada;
- alcanza el máximo cerca de la zona central / ápice;
- disminuye de nuevo hacia la salida;
- vuelve a casi cero al terminar.

Este perfil debe calcularse por PROGRESO DENTRO DE LA CURVA AGRUPADA, no por curvatura instantánea de cada nodo. Esto evita cuñas, dientes y cambios de anchura erráticos.

Usar una envolvente suave tipo `smoothstep` o equivalente para que el crecimiento y reducción no sean lineales ni bruscos.

La curvatura local puede modular ligeramente el ancho, pero nunca dominar el perfil global de la curva.

### Geometría del piano

- El piano es una banda exterior a la línea blanca del arcén.
- NO dibujarlo como un stroke grueso centrado sobre la línea.
- Para cada tramo válido, formar un cuadrilátero entre:
  - borde interior del piano = línea de arcén;
  - borde exterior del piano = desplazamiento adicional según el ancho local calculado.
- El ancho máximo debe ser moderado; referencia actual aproximada: ~11–12 px en el punto más ancho.
- El ancho mínimo debe acercarse a cero visualmente, pero puede mantenerse en ~1 px para evitar discontinuidades numéricas.

### Alternancia rojo/blanco

La alternancia NO se basa en número de nodos.

Método aprobado:

- Acumular distancia real recorrida a lo largo de la curva.
- Dividir esa distancia en bloques de longitud fija.
- Alternar color por índice de bloque.
- Referencia actual de longitud de bloque: ~18 px.

Así los bloques conservan tamaño visual coherente aunque una curva tenga muchísimos más nodos que otra.

### Filtros contra pianos defectuosos

Antes de aceptar un tramo de piano:

- comprobar que ambos extremos del borde sean visibles;
- comprobar que no esté enterrado por otra sección del trazado;
- comprobar que la dirección del borde no se haya invertido respecto al sentido de la centerline;
- eliminar fragmentos huérfanos demasiado cortos;
- no permitir islas rojas/blancas aisladas en vértices retorcidos o zonas de solapamiento.

Si un piano produce una punta, una cuña extrema o un bloque aislado, NO arreglarlo manualmente. La solución debe estar en la detección del grupo, la poda del borde o el perfil de anchura.

### Regla visual aprobada

El piano bueno debe leerse como una pieza continua de circuito:

- nace fino;
- gana presencia de forma gradual;
- es más contundente cerca del ápice;
- vuelve a adelgazar al salir;
- mantiene ritmo rojo/blanco regular;
- sigue exactamente la curva sin cruzar, retorcerse ni generar islas.

## Regla crítica para futuros circuitos

Cada nuevo circuito debe pasar esta prueba ANTES de pulir arte o decoración:

1. Dibujar temporalmente una línea blanca continua y muy visible en ambos arcenes.
2. Dar una vuelta completa y revisar especialmente horquillas y curvas de radio pequeño.
3. No aceptar el circuito si aparecen lazos, cruces, cúspides, islas o aberturas claras.
4. Solo cuando la línea salga limpia, convertirla en el arcén visual definitivo.
5. Añadir después los pianos usando exclusivamente el sistema agrupado y recortado descrito arriba.
6. Dar varias vueltas completas y comprobar que:
   - no hay pianos aislados;
   - no hay cuñas o puntas;
   - el ancho crece y decrece de forma natural;
   - la alternancia rojo/blanco tiene escala coherente;
   - no aparecen ralentizaciones progresivas.

## Rendimiento móvil

Checkpoint de comportamiento esperado: varias vueltas completas sin tirones. La referencia actual aprobada llegó a 8 vueltas consecutivas fluidas sin degradación de rendimiento.

Nunca sacrificar esta fluidez por geometría decorativa.

Evitar:

- miles de primitivas `Graphics` persistentes;
- joins circulares/polígonos adicionales dentro de la rejilla consultada cada frame;
- texturas o marcas direccionales que no sigan la orientación real de la pista;
- parches manuales por curva si pueden resolverse con la regla geométrica anterior;
- construir pianos con una segunda geometría distinta a la del borde ya validado.

## Commits de referencia de pianos

- `fb9b17a` — primera versión de pianos recortados por borde seguro
- `721001a` — reconstrucción como bandas reales por longitud de arco
- `8168418` — anchura variable según la curva
- `1a2daf8` — agrupación por curva completa y rechazo de segmentos plegados

El commit `1a2daf8` es la referencia visual/geométrica actual para continuar afinando pianos sin tocar la base del trazado.
