# Procedimiento reproducible: circuito de imagen nativa → TrackStudio → carrera DEV

**Estado:** borrador técnico verificable. Pendiente de aceptación visual final en iPhone para cerrar este procedimiento como validado.  
**Referencia inicial:** Karting Tenerife, TrackStudio DEV 1.2.109 (11/10/2026).  
**Rama única de publicación web:** `main`. **Versión de Google Play:** 1.1.188, gestionada por separado; no se generan APK/SDK salvo orden explícita.

## 0. Principios que NO se deben romper

1. **La imagen es el lienzo**: tamaño en píxeles de la fotografía = dimensiones del mundo en el editor y el motor. No escalar, recortar, mover ni rotar la imagen después de dibujar las líneas; el editor puede hacer zoom/pan sin alterar coordenadas.
2. Separar siempre **apariencia** (imagen PNG/WebP), **geometría lógica** (centerline y bordes Bézier), **reglas** (asfalto/hierba, puertas, sectores) y **decoración dinámica** (coche, HUD). Nunca generar un segundo asfalto o pianos encima de la foto.
3. Preservar un `.tdrtrack` de cada hito; no sobrescribir el archivo original con un experimento. No borrar datos de IndexedDB/localStorage del navegador.
4. Probar primero en **PWA DEV**, con identificador aislado `karting-tenerife-studio`; no reutilizar el slug `karting-tenerife` ni contaminar clasificaciones públicas.
5. Desplegar `main` únicamente si la CI verifica la SHA exacta de Build y Deploy en verde. La captura real en iPhone es una comprobación adicional necesaria.

## 1. Preparar la imagen

1. Partir de imagen cenital limpia, conservando el trazado exacto. Si se utiliza generación o edición gráfica, pedir explícitamente **no alterar geometría, ancho de asfalto ni curvas, ni añadir coches**.
2. Exportar imagen final en PNG o WebP. Registrar formato, anchura, altura, peso y versión de la imagen. Ejemplo de referencia Karting Tenerife: **1672 × 941 px**. Una nueva imagen de otro tamaño requiere transformar *conscientemente* todas las coordenadas; evitarlo.
3. Comprobar que la imagen ya contiene sus bordes y pianos definitivos. No volver a generar pianos, bordes ni meta a partir de la centerline durante la carrera.

## 2. Construir pista en TrackStudio

1. Abrir `https://almaprintes.github.io/TopdownCraftrace/dev/` → **TrackStudio** → modo imagen. Elegir la imagen maestra como lienzo nativo.
2. Trazar centerline Bézier ordenada según el sentido de carrera; usar zoom para ajustar curvas. Cerrar solo si realmente es un circuito de vueltas. Guardar primer `.tdrtrack`.
3. Pulsar **CREAR PISTA**, activar **AJUSTAR** y alinear cada borde independientemente al asfalto de la imagen. El lado izquierdo puede tener un número de nodos distinto del derecho; añadir puntos con **+ NODO** sin alterar la centerline original.
4. Colocar meta y checkpoints según el recorrido real. La parrilla es opcional (**PARRILLA: NO** conserva la meta). Conservar puntos lógicos incluso cuando se decida no dibujar marcas nuevas.
5. Guardar **otro** `.tdrtrack`. Reabrir y comprobar que imagen, centerline, forma izquierda/derecha, meta, checkpoints y opción de parrilla se restauran en las mismas coordenadas.

## 3. Validar e importar un .tdrtrack

El archivo es **paquete binario con cabecera + JSON del proyecto + bytes reales de imagen**; no es texto JSON convencional. Importar desde TrackStudio → carpeta → **3 · Importar JSON o .tdrtrack**.

**Fallo anterior recuperado:** un paquete contenía un `.tdrtrack` anidado en vez de una imagen; no confundirlo con un JSON mal formado. `imageCanvasProject.js` detecta cabecera y extrae PNG/JPEG/WebP anidados sin tocar la geometría del JSON exterior. Volver a guardar para normalizar el recurso de imagen. Si falla, conservar todos los archivos y revisar firma/tamaño antes de editar.

**Verificaciones:** resolución imagen = `gameTrack.worldW/H`; `trackShape` válida; `centerline` completa; meta correcta; dos lados de la forma editables; coordenadas no desplazadas por zoom; memoria IndexedDB accesible.

## 4. Instalar y probar carrera local (fase C actual)

1. Con el proyecto completo abierto en TrackStudio, pulsar **▶ PROBAR JUEGO** y confirmar.
2. `localKartingPreview.js` valida el proyecto y almacena referencia de la imagen en IndexedDB y geometría de prueba en localStorage. `RaceScene` usa `karting-tenerife-studio` como ID aislado.
3. La carrera carga el fondo original desde IndexedDB. La prueba **no lo publica como asset global**: la imagen solo existe en ese navegador/dispositivo.
4. **Asfalto** = banda comprendida entre los contornos Bézier independientes. **Hierba** = resto del lienzo, transitable con penalización. **Fuera del lienzo** = OFF.
5. La meta y los checkpoints se procesan para vueltas y sectores, sin repintarlos en la vista. Si la imagen tiene su meta dibujada, es la única marca visible. Verificar sector 1/3 → 2/3 → 3/3 y cruce final.

## 5. Aislamiento visual obligatorio (hallazgos DEV 1.2.107–1.2.109)

Al introducir un circuito con fotografía hay que excluirlo de **todos** los generadores decorativos, no solamente de los más antiguos:

- `imageNativeTrackIdentity.js`: `isImageNativeTrackScene()` identifica de forma específica la escena de fotografía; no usar `.includes('karting-tenerife')` a secas.
- `RaceKartingTenerifeIdentityVegetationScene.js`, `RaceKartingTenerifeStructuresScene.js`, `RaceKartingTenerifePaddockScene.js`, `RaceEnvironmentLayer.js`, `RaceAuthoredEnvironmentScene.js`: nunca reinyectar vegetación, edificios, gradas, garajes ni renombrar el circuito preview como oficial.
- `RaceScene.js` / `RaceWorldAlignedMaterialsScene.js`: destruir el suelo antiguo y los tiles de asfalto cuando se activa la fotografía, sin desactivar la detección de colisiones/superficie. Mantener la fotografía a la profundidad adecuada bajo el coche y el HUD.
- `RaceStyledHudScene.js`: no recrear meta o dos marcas de sector; solo permanece el panel de tiempos.
- **Hallazgo crítico de 1.2.109:** `RaceSurfaceLongitudinalScene.js` crea por separado `_edgeProbe` (líneas blancas), `_cornerCurbs` (pianos), `_premiumShoulder` y `_longitudinalAsphaltWear`. Los cuatro deben **omitirse** para imagen nativa y **destruirse** si ya estaban creados al cargar la fotografía. Limpiar `_borderLeft` o `_curbInner` por sí solo NO basta.
- Ghost/repetición: el botón flotante defectuoso «VER REPETICIÓN» venía de `RaceGhostModeScene.js`. Quitar su creador, no destruir la grabación de ghosts ni los controles de repetición legítimos en otras pantallas.

## 6. Batería de comprobaciones antes de considerar «listo»

- **Visual** (iPhone horizontal): recorrer el circuito completo verificando que no haya estructuras, líneas blancas, pianos, asfalto o marcas de meta superpuestas. Revisar sobre todo horquillas y tramos con curvas paralelas. La fotografía debe ser idéntica a la cargada en TrackStudio.
- **Lógica:** salida y rumbo del coche, dos checkpoints, vuelta completa, tiempo, récord, cambios TRACK↔GRASS y límites del mundo. Mantener minimapa y HUD sin duplicaciones.
- **Usabilidad:** TrackStudio táctil, confirmación para salir, guardar/reabrir, recuperación y no modificación accidental de nodos.
- **Regresiones:** otras pistas conservan su propio asfalto/pianos/decoración; no se alteran `RaceSurfaceLongitudinalScene` fuera del preview ni las clasificaciones de `karting-tenerife`.
- **Automáticas:** `node scripts/trackstudio-image-mode-smoke.mjs`, `node scripts/trackstudio-shape-smoke.mjs`, `node scripts/trackstudio-karting-preview-smoke.mjs`, `node scripts/karting-image-native-no-legacy-decor-smoke.mjs`, `node scripts/trackstudio-image-native-clean-visuals-smoke.mjs`, junto con la suite de `.github/workflows/pages.yml`.
- **Publicación:** commit con versión DEV incrementada y marca `[pwa-only]`; comprobar workflow Pages **Build SUCCESS** y **Deploy SUCCESS** de esa SHA; probar físicamente iPhone antes de declarar resultado final.

## 7. Publicar circuito para todos (PENDIENTE; NO confundir con preview local)

El botón **▶ PROBAR JUEGO** no hace que otros usuarios descarguen la imagen. Tras aprobar la prueba visual: incorporar el PNG/WebP maestro como asset versionado al repositorio, declararlo en registro de circuitos DEV, enlazar el JSON/forma a la misma resolución, validar memoria GPU y rendimiento Android/iOS, migrar conscientemente clasificaciones si procede y habilitar circuito como opción en el menú. **No sobrescribir la publicación de Google Play** sin instrucción específica.

## 8. Reproducibilidad, rollback y registro

Guardar junto al circuito: archivo maestro, `.tdrtrack` de origen y de cada hito, versión DEV, SHA del commit, URL de Actions y capturas de las pruebas. Ante fallo visual, comparar foto maestra contra escena, verificar qué *GameObjects* se añaden en cada wrapper, revertir solo el código de capas y **no volver a dibujar la pista**.

**Pendiente de cerrar después de la validación del usuario:** fecha de aceptación, versión exacta aprobada, capturas de las horquillas sin doble línea y decisión sobre promoción del preview a recurso universal.

## 9. Ajustar spawn y dinámica al tamaño nativo (DEV 1.2.110)

**Situación detectada tras la aprobación visual:** la imagen de Karting Tenerife mide 1672×941 px, mientras que el motor heredado se diseñó con mundo base de 8000×5000 px. No se cambia `worldW/worldH`: la imagen, los bordes y la centerline deben permanecer alineados 1:1.

- **Spawn inicial:** `spawnUpstreamOfFinish()` en `src/game/tracks/imageNativeDriving.js` proyecta el punto medio de la puerta de meta sobre la centerline y recorre el eje **hacia atrás ~65 píxeles** siguiendo la trayectoria, respetando su orientación. En este Karting el primer nodo original está ~209 px antes de meta; la posición nueva prevista es ~x1354, y521, todavía antes de la puerta. Se trata de un cálculo temporal para conducir: ni el primer nodo Bézier ni la meta se alteran en el `.tdrtrack`. Existe fallback al spawn anterior si la puerta es inválida o está alejada del recorrido.
- **Conducción normalizada:** `imageNativeDrivingProfile()` adapta velocidades y aceleración en unidades de píxeles **solo** si `trackKey === 'karting-tenerife-studio'`. Para 1672×941 usa un factor suave cercano a **0,72** sobre velocidad, aceleración y fuerza de freno, y eleva el giro a aproximadamente **1,55×**. Reduce también el umbral de giro a baja velocidad. La escala es intencionadamente moderada para mantener carreras jugables; NO es una conversión literal 0,20× del mundo antiguo.
- **Aislamiento:** los coches, los ajustes del garaje y los circuitos oficiales usan la misma dinámica anterior. Cada recálculo parte de los parámetros originales para que los multiplicadores no se acumulen.
- **Prueba manual requerida:** abrir de nuevo TrackStudio con el mismo archivo, pulsar `▶ PROBAR JUEGO` para actualizar la copia local, comprobar que el coche sale a pocos metros visuales de meta **por el lado correcto**, cruza en sentido válido y supera las horquillas sin giro imposible. Ajustar el factor en una DEV posterior según las impresiones, sin redibujar ni cambiar el tamaño de la fotografía.
- **Regresión automatizada:** `node scripts/trackstudio-image-native-drive-scale-smoke.mjs`, añadido al pipeline de GitHub Pages, cubre las coordenadas de ejemplo de Karting Tenerife, orientación de meta, no-mutación de centerline, relación de escalas y preservación del resto de circuitos.

**Estado:** revisión visual del entorno aprobada por el usuario; nueva calibración de spawn y dirección pendiente de prueba táctil real en iPhone.
