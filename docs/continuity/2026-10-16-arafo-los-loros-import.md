# DEV 1.2.235 — Arafo → Los Loros — nuevo TrackStudio del propietario (16 Oct 2026)

Fuente aportada por el propietario y autorizada para reemplazar **solo Arafo → Los Loros**:
`trackstudio-image-1792152097432.tdrtrack`, SHA-256
`b3a4ec6e6ba74a5303ab515f79144e397d9596729a8b1b4cbaf3d16452814eb7`.

## Geometría integrada en main

- Track Registry identity: `rally-arafo-los-loros`; nombre público original preservado.
- Archivo de destino: `src/game/tracks/library/rally-arafo-los-loros/track.json`.
- Proyecto original: fotografía **1882 × 3344**, trazado de **2241 puntos**, 81 nodos Bézier editor, anchura media autor 40 px, `closed=false`, `raceType=stage`, start separado de meta, dos CP explícitos.
- Para transmitir los datos por el conector de GitHub basado en texto, se preservó la geometría original con **477 anclajes de simplificación RDP a tolerancia máxima 0.75 píxel** y se remuestreó con segmentos de ~4 px (más de 2700 puntos). El recorrido no se cierra ni conecta META→SALIDA. Las anchuras se interpolaron a centésimas y los nodos en coordenadas enteras; NO equivale a los 2241 puntos byte por byte.
- Las cuatro puertas son las exportadas por el usuario y se proyectan sobre la ruta en orden: START, CP1, CP2, META. Los normales de avance se mantienen. No hay vueltas: se recompensa al llegar al final, por la ruta de stage existente.
- `carScale=0.35` se aplica SOLO al circuito importado debido a la carretera mucho más estrecha (40 px) y al lienzo físico original 1882 × 3344. Se conservan las fichas de coche y las físicas calibradas globalmente.
- Los parámetros reales importados son `sampleStepPx=12`, `cellSize=400`, `grassMargin=120`, `shoulderPx=10`.

## Fotografía y límites de publicación

El PNG original está **dentro del adjunto de la conversación**, NO en GitHub. Se preparó un WebP maestro de **1882 × 3344** y 4 mosaicos de **941 × 1672** para subir al repositorio, agrupados en el archivo descargable `arafo-los-loros-photo-assets.zip`. También se empaquetó el JSON `trackstudio-gameTrack-exact.json` para conservar los 2241 puntos y el trackShape abierto con controles Bézier originales.

**NO declarar instalada la foto**: el conector GitHub de este chat escribe archivos UTF-8, pero no puede acceder a los bytes del adjunto y el contenedor no tiene salida de red. No existen todavía los WebP en `public/assets/tracks/rally-arafo-los-loros/`; por seguridad el track.json no anuncia `renderMode:'image-native'` y corre con el escenario clásico. **No conectar un assetPath inexistente**.

Siguiente paso cuando el propietario suba los WebP: incorporar geometría exacta de `trackstudio-gameTrack-exact.json` (incluido el `trackShape.closed:false`), habilitar pistas foto-nativas abiertas en `imageNativeRaceLoader.js` (actualmente excluye `track.closed===false` y `!shape.closed`), crear máscara abierta sin cierre perimetral, configurar `imageNative` publicado con 4 mosaicos y probar iPhone + Android. Verificar no trazar recta de retorno ni tapar la foto con decorado heredado.

## Decoración y colisiones

No existe archivo `rally-arafo-los-loros.environment.json` ni otra decoración/colisión oficial versionada para este circuito en `main` a fecha de revisión. **No inventar ni trasladar** barreras de otro circuito. Un borrador guardado en IndexedDB de otro navegador no es accesible en este repositorio. Si el usuario proporciona su export de Environment Studio, se puede migrar solo previa comprobación de coordenadas de los dos lienzos.

## Validación

`scripts/rally-open-stage-visual-smoke.mjs` y `scripts/environment-stage-canvas-smoke.mjs` verifican que el tramo permanece abierto y no introduce una unión META-SALIDA; CI Build y Deploy deben terminar en verde antes de declarar publicada esta DEV. No publicar en Google Play.
