# Auditoría de siluetas alfa y tres kartings — 17/10/2026

Nueva etapa de análisis sin cambios de runtime, siguiendo a `DEV 1.2.263` y matriz de 108 combinaciones. `scripts/audit-car-alpha-kartings.mjs` inspecciona las imágenes cenitales exactas, separa márgenes transparentes con umbral alfa 16/255, combina el factor de escala visual actual y `skinGeometry` y compara Spark y Cuper en Karting Tenerife, Américas y Canarias usando los anchos Bézier obtenidos tras los instaladores del build.

GitHub Actions: paso `Medir siluetas alfa y contrastar los tres kartings` y artefacto `TDR-car-alpha-kartings-audit` con `INFORME.md` y `alpha-kartings.json`. Comprobación RGBA reproducible con `scripts/audit-car-alpha-kartings-smoke.mjs`. Se advierte que una bounding box alfa no es la anchura real de la carrocería en metros, ni mide la piel 3D del coche, colisiones ni la opción seleccionada por cada jugador.

NO modificar tamaño de mundo ×2,5 de Canarias, carScale 0,35 de Arafo, colisiones, cámara, fotos originales, culling ni Google Play en esta fase. El objetivo es fundamentar qué cambiar en el futuro.
