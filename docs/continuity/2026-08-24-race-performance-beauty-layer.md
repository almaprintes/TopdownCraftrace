# Handoff — 2026-08-24 — Rendimiento de carrera + Beauty Layer

Repositorio: `almaprintes/TopdownCraftrace`
Rama: `main`

## Instrucción de arranque para el siguiente chat

ANTES DE TOCAR CÓDIGO:

1. Inventariar y leer TODOS los archivos `.md` relevantes del repositorio, especialmente:
   - todos los `.md` en raíz;
   - `docs/**/*.md`;
   - `docs/continuity/**/*.md`;
   - cualquier handoff, STATE, CHATS, PROJECT_HANDOFF o documento de arquitectura.
2. Tratar esos `.md` como contexto acumulado del proyecto, no solo `docs/CHATS.md`.
3. Verificar después el estado REAL de `main` con GitHub y no asumir que el último texto del chat equivale al código actual.
4. No afirmar cambios ni commits sin verificarlos.

## Reglas críticas del usuario

- Usar el GitHub conectado real. No decir que no hay acceso al repo sin intentar primero el conector.
- Si se elimina un elemento visual, eliminarlo de verdad: `destroy`, listeners fuera y rutas de `update` desconectadas. Nada de dejar GameObjects invisibles funcionando.
- Separar render visual de física/lógica.
- BASE 1.0 de física sigue congelada salvo defecto concreto.
- Prioridad alta: rendimiento estable en móviles, bajo calentamiento y compatibilidad razonable con hardware antiguo.
- El usuario prueba en iPhone real; no afirmar que algo funciona en dispositivo hasta que él lo confirme.

---

# 1. Problema original de rendimiento de carrera

En iPhone 16 Pro Max se observaron:

- microstutter/latigazos;
- FPS que caían con las vueltas;
- empeoramiento progresivo tras 3–4 vueltas;
- calentamiento claro del iPhone y consumo alto de batería;
- asfalto apareciendo/dibujándose al entrar en nuevas zonas del circuito.

Se hizo una campaña larga de optimización. El usuario iba probando cada cambio en iPhone.

## Hallazgos importantes

### HUD/debug
Había HUDs y elementos debug antiguos que seguían vivos/actualizándose. Se eliminó lógica duplicada y el HUD inferior quedó simplificado a VELOCIDAD + TIEMPO.

Regla permanente acordada:

> Si algo se quita de la interfaz, se destruye y se desconecta completamente. No se oculta para dejarlo trabajando por debajo.

### Minimap y proyección
Se eliminó una proyección de centerline costosa por frame para el marcador de minimapa y se quitó un overlay debug legado. Esto redujo parte del microstutter.

Commit relevante:
`c174bc0d8711c782c1accb85ae99881bf87fb790` — Remove race debug overlay and lighten minimap updates.

### Culling por chunks
El circuito usaba chunks visuales con `cullRadiusCells`. El asfalto podía verse aparecer en rectas largas.

Se probaron varias estrategias:

- radio mayor;
- recalcular culling solo al cambiar de celda;
- precarga direccional;
- lookahead siguiendo centerline.

El culling mejoró, pero seguía habiendo calentamiento y trabajo gráfico innecesario.

---

# 2. Hallazgo decisivo: hornear el asfalto

Se hizo un piloto en Karting Tenerife:

1. forzar la creación inicial de chunks de asfalto;
2. rasterizarlos durante preparación;
3. destruir chunks, overlays y máscaras originales;
4. dejar RenderTextures estáticas.

Resultado confirmado por el usuario:

- ~60 FPS sostenidos;
- `UP` alrededor de 0.7–1.5 ms;
- `FRAME MAX` ~17–18 ms;
- objetos bajaron aproximadamente de 167–175 a ~98–101;
- no hubo calentamiento perceptible tras varias vueltas;
- desapareció el gran problema de pop-in cercano.

Esta es la dirección correcta: el circuito es mayoritariamente estático y no necesita reconstruirse durante la carrera.

---

# 3. Intentos de texturas realistas y lecciones

Se intentó mejorar asfalto/césped usando WebP y materiales procedurales.

Hubo varios problemas:

- capas posteriores pisaban texturas anteriores;
- algunos intentos con Canvas/data URLs produjeron texturas corruptas negro/verde;
- al usar TileSprites por chunk aparecía una cuadrícula/repetición visible;
- incluso alineando UVs al mundo seguían apareciendo costuras/repeticiones;
- una textura V2 de asfalto incluía accidentalmente trozos de circuito (pianos/césped), por lo que repetía elementos incorrectos;
- volver a un asfalto limpio hizo que visualmente quedara demasiado liso.

Conclusión: NO seguir intentando que el mundo visual final se construya con materiales repetidos por chunk.

---

# 4. Dirección final acordada: BEAUTY LAYER 2×2

El usuario propuso la analogía correcta: usar el circuito actual como “pared” y poner encima un “papel pintado” perfecto.

La arquitectura final acordada es:

## Capa lógica invisible (SE CONSERVA)

Mantener exactamente la estructura actual para:

- física;
- límites;
- colisiones;
- checkpoints;
- sectores;
- vueltas;
- centerline;
- detección de superficie (asfalto / césped / offroad / piano, etc.).

## Capa visual (SE SUSTITUYE)

Para Karting Tenerife, usar una imagen beauty del mundo completo, dividida en 4 WebP grandes 2×2.

La imagen completa del circuito proporcionada por el usuario es el MOLDE GEOMÉTRICO. La idea no es reinterpretar la pista, sino conservar exactamente las formas visuales de:

- asfalto;
- borde del asfalto;
- césped;
- offroad.

Las texturas pueden ser mucho más realistas, pero la geometría visual debe coincidir exactamente con el circuito actual.

La física NO lee estos WebP. Los WebP son solo apariencia.

### Tamaño de mundo usado para el piloto

Karting Tenerife está en torno a:

- worldW: 2813
- worldH: 2602

Beauty layer planeada como 2×2:

- tile 0: x=0, y=0, w=1407, h=1301
- tile 1: x=1407, y=0, w=1406, h=1301
- tile 2: x=0, y=1301, w=1407, h=1301
- tile 3: x=1407, y=1301, w=1406, h=1301

Se generó fuera del repo un pack de trabajo llamado:
`karting-tenerife-beauty-pack.zip`

Contenía:

- `karting-tenerife-beauty-0.webp`
- `karting-tenerife-beauty-1.webp`
- `karting-tenerife-beauty-2.webp`
- `karting-tenerife-beauty-3.webp`
- `manifest.json`

IMPORTANTE: ese pack se generó como arte de trabajo, pero en el momento de este handoff NO debe asumirse integrado en el repo. Verificar GitHub real antes de actuar.

---

# 5. Estado real conocido de `main` al final de la sesión

Antes de este handoff, `game.js` seguía importando:

`RaceWorldAlignedMaterialsScene.js`

Es decir: el experimento visual global de asfalto seguía siendo la escena activa, NO la beauty layer 2×2 final.

El último `main` verificado durante la sesión quedó en torno a:
`0e3065d4305f5ad3300a6a90ca19abeec71c1628`

PERO el siguiente chat debe volver a verificar la punta REAL de `main`, porque hubo muchas escrituras/experimentos y no hay que confiar en memoria textual.

Archivos relevantes de esta fase:

- `src/game/scenes/RaceScene.js`
- `src/game/scenes/RaceBakedAsphaltScene.js`
- `src/game/scenes/RaceRealSurfaceAssetsScene.js`
- `src/game/scenes/RaceWorldAlignedMaterialsScene.js`
- `src/game/scenes/RaceDirectionalCullScene.js`
- `src/game/game.js`
- `public/assets/materials/asphalt-real.webp`
- `public/assets/materials/grass-real.webp`

No borrar ni simplificar capas sin entender primero la cadena de herencia real y cuál es la escena final registrada.

---

# 6. Próximo paso inmediato

NO seguir iterando texturas por chunk.

Implementar un piloto de Beauty Layer para Karting Tenerife:

1. Conseguir/subir los 4 WebP beauty al repo, por ejemplo:
   `public/assets/tracks/karting-tenerife/beauty/`
2. Cargarlos en `preload()` solo para Karting Tenerife.
3. Crear una capa visual tipo `trackBeautyLayer` que coloque los 4 tiles en coordenadas exactas de mundo.
4. La capa beauty debe quedar por debajo del coche/props/HUD.
5. Desactivar o destruir COMPLETAMENTE el render visual anterior de asfalto/césped/offroad para Karting Tenerife. No dejarlo invisible actualizándose.
6. Mantener intacta la lógica de superficie y física actual.
7. Evitar duplicados de props: coche, HUD, árboles, grada, línea de meta, etc. NO deben estar horneados dentro del beauty map si también existen como objetos separados.
8. Añadir una bandera extensible tipo `useBeautyLayer: true` o configuración equivalente por circuito.
9. Probar alineación en puntos de referencia: recta de meta, horquilla derecha, S central, curva grande inferior izquierda.
10. Medir nuevamente FPS, `UP`, `FRAME MAX`, OBJ y temperatura.

Objetivo: mismo rendimiento/temperatura del piloto horneado, pero con un salto visual grande y sin repetición/costuras por chunks.

---

# 7. Qué NO hacer

- No volver a decir que no hay acceso al repo sin intentar GitHub.
- No volver a pedir al usuario que integre manualmente algo que el asistente puede integrar con el conector.
- No ocultar objetos viejos para “sacarlos de pantalla”; destruirlos y cortar su lógica.
- No tocar BASE 1.0.
- No confundir la imagen beauty con la lógica de superficie.
- No redibujar/reinterpretar el trazado: la geometría actual manda.
- No meter pianos/césped/curvas dentro de una textura repetible de asfalto.

---

# 8. Criterio visual objetivo

El usuario quiere acercarse a un aspecto premium/realista de top-down racer:

- asfalto con grano, goma, desgaste y variación tonal;
- césped más rico y natural;
- offroad/tierra/grava con textura convincente;
- pianos y bordes definidos;
- entorno con mayor riqueza;
- pero manteniendo lectura clara en móvil y rendimiento alto.

El usuario dejó claro que quiere llegar a ese resultado cuanto antes y prefiere una solución visual horneada robusta frente a más microparches del sistema antiguo.
