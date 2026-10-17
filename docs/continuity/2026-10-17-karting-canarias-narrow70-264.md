# DEV 1.2.264 — Karting Canarias Narrow-70 (variante independiente)

Se implementa **solo PWA DEV**, con ID `karting-canarias-narrow70`, para comparar contra el Canarias actual, sin sustituir sus datos originales ni mezclar récords. El usuario aprobó estrechar el asfalto conservando la duración aproximada de vuelta.

**Geometría:** se conserva x2.5, la centerline completa de 506 puntos, meta/CP (centros y normales), spawn y física de coches. El ancho fuente nominal pasa 105→70; en mundo 262,5→175. Las anchuras especiales y los 18 pares de controles Bézier se interpolan hacia los nodos originales de Track Studio en razón 70/105, conservando controles editables y curvaturas. Meta/CP reducen su tramo transversal al mismo factor; la identidad de circuito se aísla para no registrar tiempos junto a la original.

**Fotografía:** `scripts/install-karting-canarias-narrow70.mjs` genera una versión raster alternativa a partir del WebP original byte-intacto: una deformación local guiada por el centro de carretera estrecha las bandas de asfalto y comprime las cercanías con muestreo bilineal. Es **procesamiento offline durante build**; las 4 teselas resultantes se sirven estáticas y se producen también las variantes compactas actuales iOS. Este método puede deformar pianos, objetos laterales y curvas muy cerradas: debe inspeccionarse visualmente antes de sustituir Canarias. No se añade trabajo en cada frame ni culling.

**Colisiones:** las cinco barreras y zona sólida originales de Environment Studio se leen del export oficial y mantienen su escala x2.5; debe comprobarse si alguna barrera queda dentro del asfalto ahora más estrecho. No se altera el fichero de exportación original.

**Acceso:** tarjeta exclusiva de la DEV con el nombre `KARTING CANARIAS · NARROW 70 · DEV` y desbloqueada. No se incorpora a los 6 circuitos de `PUBLISHED_TRACK_IDS`; el registro de build PROD omite la variante. El botón de selección deja guardada su clave independiente hasta seleccionar el original.

**Pruebas:** ejecutar `scripts/karting-canarias-narrow70-smoke.mjs` tras el instalador, además de los smoke originales y Build+Deploy del HEAD. No lanzar Android/APK/AAB ni modificar Play Store. No afirmar que resuelve el calor o la pérdida de nitidez; problema iPhone independiente.
