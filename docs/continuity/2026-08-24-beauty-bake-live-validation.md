# Handoff — 2026-08-24 — Beauty Bake live + pipeline ganador

Repositorio: `almaprintes/TopdownCraftrace`
Rama: `main`

## Resumen ejecutivo

Se ha validado en iPhone real el nuevo flujo visual de circuitos:

`track.json` → `TrackBuilder.js` → bake offline determinista → preview + 4 WebP → Beauty Layer en runtime.

Este flujo separa completamente la lógica/física de la apariencia y permite mantener la geometría exacta del circuito mientras el render del terreno pasa a ser casi estático y barato.

La física BASE 1.0 permanece congelada y NO se ha tocado.

---

## 1. Regla arquitectónica nueva

La geometría y la lógica de pista son la fuente de verdad.

Se conserva para gameplay:

- física;
- centerline;
- checkpoints;
- sectores;
- vueltas;
- colisiones;
- detección de superficies;
- IA y métricas derivadas.

La apariencia se genera offline y se carga como tiles grandes.

NO volver a construir la pista visual final con texturas repetidas por chunk, TileSprites por celda o capas procedurales complejas durante la carrera.

---

## 2. Baker offline determinista

Archivo creado:

`scripts/bake-track-visual.mjs`

Comando:

`npm run bake:track -- karting-tenerife`

El baker:

1. lee `src/game/tracks/library/karting-tenerife/track.json`;
2. reutiliza `src/game/tracks/TrackBuilder.js`;
3. genera el mundo completo con la misma geometría real que usa el juego;
4. exporta preview completa;
5. divide el mundo en 4 WebP 2×2;
6. genera `manifest.json`.

Commit del comando/baker inicial:

`084ded08cf296a56d3f7f2b607e665ef6eb7b9c1` — Add track beauty bake command.

---

## 3. Automatización GitHub Actions

Workflow creado:

`.github/workflows/bake-karting-tenerife.yml`

Commit:

`ce9b6a88213dd8cd0a1d38527bd21766bafc9d79` — Automate Karting Tenerife beauty bake.

El workflow:

- instala dependencias;
- ejecuta el baker;
- copia los resultados a `public/assets/tracks/karting-tenerife/beauty/`;
- hace commit automático solo si cambian los assets.

Commit automático de assets generado por GitHub Actions:

`0b0e74836d518c0a90ef3af8e92f886e0cffc205` — Bake Karting Tenerife beauty assets.

Assets generados:

- `karting-tenerife-beauty-preview.webp`
- `karting-tenerife-beauty-0.webp`
- `karting-tenerife-beauty-1.webp`
- `karting-tenerife-beauty-2.webp`
- `karting-tenerife-beauty-3.webp`
- `manifest.json`

---

## 4. Geometría validada

Datos del bake:

- worldW: `2813`
- worldH: `2602`
- centerSamples: `1850`
- trackWidth: `66.6`
- grassMargin: `220`
- sampleStepPx: `8`
- cellSize: `240`

Tiles:

- tile 0: x=0, y=0, w=1407, h=1301
- tile 1: x=1407, y=0, w=1406, h=1301
- tile 2: x=0, y=1301, w=1407, h=1301
- tile 3: x=1407, y=1301, w=1406, h=1301

El usuario revisó la preview y confirmó que, a simple vista, la geometría coincide exactamente.

Puntos de referencia usados:

- recta de meta;
- horquilla derecha;
- S central;
- curva grande inferior izquierda.

Conclusión: NO volver a redibujar/reinterpretar el trazado. La geometría del baker es ya la referencia visual correcta.

---

## 5. Integración en runtime

La infraestructura de Beauty Layer ya existe dentro de:

`src/game/scenes/RaceWorldAlignedMaterialsScene.js`

No se creó una nueva escena activa final. `game.js` sigue usando `RaceWorldAlignedMaterialsScene.js`.

La escena:

- carga los WebP solo si la pista tiene Beauty disponible;
- valida dimensiones del mundo;
- valida dimensiones exactas de cada tile;
- crea los cuatro GameObjects de imagen;
- destruye el render de terreno viejo;
- mantiene intacta toda la lógica de pista.

Al activar Beauty se destruyen realmente, no se ocultan:

- `bgGrass`;
- `bgOff`;
- máscaras de grass;
- baked asphalt previo;
- tiles/overlays/strokes/masks por celda;
- overlays visuales de superficie antiguos aplicables.

La geometría de `track.geom` NO se destruye ni sustituye.

---

## 6. Configuración activa

Archivo:

`src/game/tracks/trackBeautyLayers.js`

Karting Tenerife quedó con:

- `useBeautyLayer: true`
- `assetsAvailable: true`
- `asphalt: true`
- `grass: true`
- `offroad: true`
- `kerbs: false`
- `props: false`

Commit de activación:

`1aa5fd1aa391b9337a8b73efb651a962347fa7e9` — Activate Karting Tenerife beauty layer.

Los pianos y props siguen separados por ahora para evitar duplicados mientras el bake artístico aún no los integra expresamente.

---

## 7. Validación real en iPhone

El usuario entró a Karting Tenerife y condujo sobre la Beauty Layer.

Captura reportada:

- FPS: `60`
- L1 UP: `2.4 ms`
- FRAME MAX: `16.7 ms`
- OBJ: `96`

La pista horneada aparece correctamente en carrera y la geometría visual coincide con la lógica de conducción.

Esto confirma que el nuevo pipeline no es solo una preview: funciona ya dentro de la carrera real.

No afirmar aún conclusiones térmicas definitivas de esta versión hasta que el usuario haga una prueba más larga y lo confirme.

---

## 8. Estado visual actual

El bake actual es TÉCNICO, no final.

Problemas vistos en la captura:

1. Césped con bandas horizontales demasiado evidentes.
2. Asfalto demasiado uniforme/granuloso y con aspecto artificial.
3. Líneas blancas de borde excesivamente limpias y separadas del material.
4. Pianos todavía pertenecen a una capa visual distinta y no forman un conjunto coherente con el bake.
5. Falta riqueza local: goma, frenadas, suciedad, parches, desgaste, transiciones y variación por zonas.

La geometría ya NO es el problema. El trabajo restante es artístico.

---

## 9. Próxima fase: Beauty Bake 2.0

Objetivo inmediato: convertir el bake técnico en una pista visual de calidad comercial manteniendo EXACTAMENTE la misma geometría.

### Asfalto

- árido fino realista;
- variación tonal a varias escalas;
- reparaciones/parches discretos;
- goma siguiendo la trazada;
- zonas de frenada más castigadas;
- vértices con desgaste más marcado;
- evitar repetición visible.

### Césped

- eliminar bandas horizontales artificiales;
- variación orgánica;
- zonas secas/húmedas discretas;
- desgaste cerca de pista;
- corte menos uniforme.

### Bordes/transiciones

- transición asfalto→césped/tierra más natural;
- acumulación de suciedad;
- borde menos “dibujado con rotulador”;
- pequeñas imperfecciones locales.

### Pianos

- integrarlos visualmente cuando el bake artístico esté listo;
- desgaste ligero;
- unión creíble con asfalto y exterior;
- al integrarlos, cambiar configuración para evitar duplicarlos en runtime.

### Cohesión general

- que todo parezca una única superficie física real;
- evitar aspecto de capas independientes;
- mantener excelente legibilidad en móvil.

---

## 10. Reglas permanentes a partir de este hito

1. Física BASE 1.0 NO se toca para mejorar gráficos.
2. Geometría de pista NO se modifica durante el Beauty Bake.
3. La pista visual se deriva de datos reales, no de redibujado generativo.
4. Todo render viejo sustituido debe destruirse y desconectarse realmente.
5. Runtime barato: la belleza se cocina offline.
6. Karting Tenerife es el circuito piloto del pipeline visual para el resto del juego.
7. Una vez validado Beauty Bake 2.0, convertir este flujo en estándar para todos los circuitos.
8. No volver a la ruta de texturas repetibles por chunks como solución final.

---

## 11. Definición de éxito

Karting Tenerife queda homologado visualmente cuando se cumplan simultáneamente:

- geometría visual exacta;
- cero costuras visibles entre tiles;
- asfalto/césped/offroad con acabado premium;
- pianos integrados sin duplicados;
- 60 FPS o rendimiento equivalente al baseline bueno;
- FRAME MAX estable;
- número de objetos bajo;
- sin calentamiento perceptible tras varias vueltas confirmado por el usuario;
- no hay regresiones en física, IA, checkpoints, vueltas o superficies.

---

## 12. Instrucción para próximos chats

Antes de tocar el sistema visual, leer este archivo junto con:

- `docs/continuity/2026-08-24-race-performance-beauty-layer.md`
- `docs/PHYSICS_BASE_1_0_2026-08-19.md`
- `docs/TRACK_GEOMETRY_RULES.md`
- `docs/TRACK_REGISTRY_SINGLE_SOURCE_RULE.md`

Y verificar siempre el `main` REAL de GitHub antes de afirmar estado o commits.
