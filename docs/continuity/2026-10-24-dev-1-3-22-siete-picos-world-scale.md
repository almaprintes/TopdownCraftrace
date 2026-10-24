# DEV 1.3.22 — 7 Picos, ×2,5 y Environment Studio

Fecha: 24 de octubre de 2026. Rama: main.

- La fuente `src/game/tracks/library/siete-picos/source/7-picos.tdrtrack` permanece idéntica, SHA256 `270261f98c716a4c1b55a4e6184527c4347f140fc40f2d4af0c262f356f794cb`.
- El instalador transforma SOLO el espacio lógico de juego de 1448×1086 a 3620×2715, ×2,5, y conserva la fotografía PNG maestra original y el WebP de 1448×1086. No hay más memoria de texturas GPU.
- Transforma centerline 730 muestras (ancho por muestra), nodos y asas de ambos bordes Bézier (26 cada uno), start, meta, CP y parámetros métricos. Sin cambios de coches, físicas, dirección o registros.
- `imageNative.worldScale=2.5` específicamente autorizado en el validador nativo de 7 Picos y representación igual en Environment Studio.
- JSON Environment Studio del usuario (export v8) instalado al repo en v7, coordenadas `race-world`, preserva 2 barreras Bézier (38+35 nodos, halfThickness de 9 a 22,5), 1 decoración meta; 0 zonas y 0 Copas. La carrera sí carga las colisiones gracias a la ampliación de la lista de circuitos foto-nativos admitidos.
- Se mantiene `hiddenFromTrackSelect:true` hasta completar revisión. No APK/AAB ni Play. `node scripts/siete-picos-world-scale-smoke.mjs` se ejecuta en prebuild.
- **Atención**: la previsualización local original del .tdrtrack sigue siendo pequeña; para ver la ampliación, abrir 7 Picos instalado en Environment Studio/DEV. No volver a importar el JSON antiguo sin convertir sus coordenadas: el oficial ya está transformado.
