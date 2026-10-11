# Procedimiento reproducible: circuito de imagen nativa → TrackStudio → carrera DEV

**Estado:** borrador técnico verificable. Pendiente de aceptación visual final en iPhone para cerrar este procedimiento como validado.  
**Versión de referencia actual:** Karting Tenerife, TrackStudio DEV 1.2.113 (11/10/2026): restitución de escena 1:1 y físicas de fábrica.  
**Rama única de publicación web:** `main`. **Versión de Google Play:** 1.1.188, gestionada por separado; no se generan APK/SDK salvo orden explícita.

## 0. Principios que NO se deben romper

1. **La imagen es el lienzo**: los píxeles de la fotografía coinciden con las coordenadas del **editor y de la carrera** 1:1. Mantener la fuente y la geometría alineadas. **La prueba de mundo ×3 quedó descartada; no escalar imágenes/curvas en runtime ni las físicas de los vehículos.**
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

## 9. HISTÓRICO — ajuste temporal de físicas en DEV 1.2.110 (REVOCADO)

**Este apartado es histórico y está REVOCADO por DEV 1.2.111.** La imagen de Karting Tenerife mide 1672×941 px, mientras que el motor heredado usa circuitos mayores. Se probó un ajuste específico de conducción en 1.2.110, pero el propietario rechazó modificar las físicas calibradas de sus coches. **No reproducir esa solución.**

- **Spawn inicial:** `spawnUpstreamOfFinish()` en `src/game/tracks/imageNativeDriving.js` proyecta el punto medio de la puerta de meta sobre la centerline y recorre el eje **hacia atrás ~65 píxeles** siguiendo la trayectoria, respetando su orientación. En este Karting el primer nodo original está ~209 px antes de meta; la posición nueva prevista es ~x1354, y521, todavía antes de la puerta. Se trata de un cálculo temporal para conducir: ni el primer nodo Bézier ni la meta se alteran en el `.tdrtrack`. Existe fallback al spawn anterior si la puerta es inválida o está alejada del recorrido.
- **Conducción normalizada:** `imageNativeDrivingProfile()` adapta velocidades y aceleración en unidades de píxeles **solo** si `trackKey === 'karting-tenerife-studio'`. Para 1672×941 usa un factor suave cercano a **0,72** sobre velocidad, aceleración y fuerza de freno, y eleva el giro a aproximadamente **1,55×**. Reduce también el umbral de giro a baja velocidad. La escala es intencionadamente moderada para mantener carreras jugables; NO es una conversión literal 0,20× del mundo antiguo.
- **Aislamiento:** los coches, los ajustes del garaje y los circuitos oficiales usan la misma dinámica anterior. Cada recálculo parte de los parámetros originales para que los multiplicadores no se acumulen.
- **Prueba manual requerida:** abrir de nuevo TrackStudio con el mismo archivo, pulsar `▶ PROBAR JUEGO` para actualizar la copia local, comprobar que el coche sale a pocos metros visuales de meta **por el lado correcto**, cruza en sentido válido y supera las horquillas sin giro imposible. Ajustar el factor en una DEV posterior según las impresiones, sin redibujar ni cambiar el tamaño de la fotografía.
- **Regresión automatizada:** `node scripts/trackstudio-image-native-drive-scale-smoke.mjs`, añadido al pipeline de GitHub Pages, cubre las coordenadas de ejemplo de Karting Tenerife, orientación de meta, no-mutación de centerline, relación de escalas y preservación del resto de circuitos.

**Estado:** revisión visual del entorno aprobada por el usuario; nueva calibración de spawn y dirección pendiente de prueba táctil real en iPhone.

## 10. HISTÓRICO, DESCARTADO — mundo ×3 sin tocar las físicas (DEV 1.2.111)

El propietario confirma la fotografía y el rendimiento de Karting Tenerife, pero exige preservar íntegramente las características originales de cada coche. **Solución aprobada para probar: ampliar exclusivamente la geometría del mundo de carrera, sin aumentar la resolución de la imagen ni retocar aceleración/dirección/grip.**

1. Conservar la foto 1672×941, el `.tdrtrack` y la edición original **1:1**. No volver a trazar ni generar imágenes.
2. `src/game/tracks/imageNativeWorldScale.js` transforma **solo una copia de metadatos de carrera** con factor 3: `worldW/H`=**5016×2823**, centerline (incluidas anchuras), bordes Bézier independientes (nodos y tiradores), meta, checkpoints, spawn, offsets y distancias de render/culling. Las normales unitarias y ángulos NO se escalan. `sampleStepPx` y `cellSize` también se multiplican por 3 para que la densidad de poligonización y el recuento de celdas no se disparen innecesariamente.
3. `src/game/tracks/localKartingPreview.js` conserva el **PNG/JPEG/WebP original** en IndexedDB con sus píxeles originales; en carrera crea un `Phaser.Image` con `.setScale(3)`. No procesa una textura 5016×2823 ni la sube a la GPU; el uso de memoria de la textura se mantiene próximo al del original. Es posible algo de suavizado visual al ampliar, pero sin aumento del coste de decodificación.
4. `RaceScene.applyCarParams()` vuelve a usar exactamente `resolveCarParams(this.baseSpec, this.tuning)` en **todas** las carreras. Eliminar la solución `imageNativeDrivingProfile` (velocidad, giro, dirección y freno). Ni los archivos de coche ni los upgrades cambian.
5. Mantener el **spawn relativo a meta** a ~65 px de la fotografía (**195 unidades del nuevo mundo**), calculado antes de ampliar el mundo. No se mueve la centerline ni se adelanta el coche después de la meta.
6. La copia de prueba se almacena como versión 2. Al leer una copia local antigua (versión 1, sin escala), se transforma **en memoria** sin sobrescribir el proyecto ni tocar IndexedDB. Recomendación de uso: abrir TrackStudio y pulsar nuevamente **▶ PROBAR JUEGO**.
7. **Prueba en iPhone**: conducción sin parches de coches, spawn correcto, paso por meta, sectores, asfalto/hierba, fotografía alineada a los bordes, zoom de cámara y suavidad de fotogramas. Revisar también proporción aparente del coche y nitidez; solo afinar la visualización si hace falta, nunca físicas.
8. **Regresión automática**: `node scripts/trackstudio-image-native-drive-scale-smoke.mjs` valida escala x3 de las coordenadas, mundo 5016×2823, tamaño original de imagen, equivalencia de máscara de pista y hierba, recuperación local v1→v2 sin escritura y ausencia de ajuste de físicas.

**Importante:** la prueba x3 es un experimento visual y de conducción; no se declara definitivamente aceptada hasta recibir confirmación del iPhone. La rama única es `main`. Android público 1.1.188 intacto.

## 11. HISTÓRICO, DESCARTADO — escala visual del coche ×3 (DEV 1.2.112)

**Incidencia al conducir DEV 1.2.111:** el coche parecía un juguete muy pequeño porque la carretera y el fondo se multiplicaban por 3 en el mundo, pero el coche seguía con su tamaño visible anterior (`carScale: 0.65`). La imagen ampliada pierde un poco de nitidez por interpolación; es esperable y NO debe solventarse creando de inmediato una textura 5K que perjudique la fluidez móvil.

**Solución:** mantener la escala de mundo ×3 y la textura original 1672×941, pero multiplicar **solo la caja objetivo del sprite visual del coche** por la misma escala de mundo. Esto devuelve la proporción coche/carretera de la versión ×1 sin incrementar memoria de fondo ni alterar tamaño/tuning de los coches en otros circuitos.

- `RaceScene.js`: conservar `body.setCircle(Math.round(baseRadius * vScale * trackCarScale))` y `resolveCarParams(this.baseSpec, this.tuning)` **exactamente como estaban**. El factor `raceImageCarVisualScale()` sólo multiplica `TARGET_W`/`TARGET_H` del sprite y se aplica tanto antes como después de la carga asíncrona de la skin. Escala ×1 para circuitos normales y ×3 únicamente para `karting-tenerife-studio`.
- `RaceBicycleHandlingScene.js`: `_bikeVisualLength` calcula el parámetro de física con la anchura visible **dividida por el multiplicador de imagen**, evitando que el nuevo tamaño dibujado cambie accidentalmente la batalla efectiva y la dirección del modelo cinemático.
- El collider físico conserva el tamaño anterior deliberadamente para cumplir la condición «no tocar las físicas»; en esta prueba puede ser más pequeño que la silueta dibujada. No afirmar que se validó contacto con obstáculos físicos: en la escena con imagen nativa las zonas TRACK/GRASS consultan la posición del coche.
- No modificar `carScale` guardado en el `.tdrtrack`, la imagen, centerline, bordes, puertas, escala de mundo ×3, cámara ni récords públicos.
- **Test**: `node scripts/trackstudio-image-native-car-visual-smoke.mjs`, cubre proporción ×3, dinámica/colisión conservadas, batalla equivalente y aislamiento de otras pistas.
- **Validación pendiente en iPhone**: tamaño aparente real del coche, curva lenta/rápida, superposición con asfalto y suavidad. Si la foto queda borrosa a zoom habitual, plantear después textura 2× o tiles WebP bajo prueba de memoria, nunca 5K monolítica por defecto.

La aceptación visual de la escena completa y de las proporciones sigue pendiente del propietario.

## 12. ESTADO ACTUAL — rollback a la fotografía 1:1 con coches de fábrica (DEV 1.2.113)

**Decisión del propietario (11/10/2026): no más pruebas con escala de mundo.** Restaurar exactamente el aspecto anterior a DEV 1.2.111 y conservar las físicas **sin la normalización** que se había ensayado en 1.2.110.

1. Restaurado `makeKartingPreviewRecord()` para que `worldW/H`, centerline, bordes y puertas se mantengan **iguales a los píxeles de la imagen**, sin `imageWorldScale` en la carrera. La imagen se renderiza a `setOrigin(0,0)`, **sin `setScale(3)`**; no se toca el master en IndexedDB ni el `.tdrtrack`.
2. El coche recupera el tamaño visual anterior (`carScale: 0.65`, las mismas `TARGET_W/H`), la batalla de dirección original y el radio de colisión sin cambios. `RaceScene.applyCarParams()` emplea siempre `resolveCarParams(this.baseSpec, this.tuning)`; queda explícitamente prohibido volver a `imageNativeDrivingProfile()`.
3. El spawn cercano a meta, el aislamiento de edificios/pianos, el render fotográfico, los checkpoints invisibles, el cronómetro y demás mejoras ya aprobadas permanecen.
4. **Compatibilidad hacia atrás:** para evitar que una copia efímera de prueba de DEV 1.2.111 o 1.2.112 mantenga el mundo ×3 al volver, `getLocalKartingPreview()` restaura a escala nativa **en memoria**, sin sobrescribir datos del usuario. La próxima vez que se pulse **▶ PROBAR JUEGO**, guardará directamente el formato original de preview (versión 1).
5. **Pruebas regresión:** `node scripts/trackstudio-karting-preview-smoke.mjs` y `node scripts/trackstudio-image-native-rollback-smoke.mjs`. Los tests exclusivos de escala de mundo/coche ×3 se retiran del pipeline. Build + Deploy de la misma SHA verde antes de entregar.
6. **Próxima fase — aportará una imagen nueva el usuario:** preparar foto aproximadamente **3200×1800** y convertirla a WebP de calidad inicial **86**, respetando el trazado, diseñar y reimportar el proyecto con sus coordenadas nativas. La reducción de tamaño en WebP afecta la descarga y almacenamiento, **no la RAM/GPU decodificada**; medir fluidez en móviles antes de darla por óptima.

Este rollback **no revierte las mejoras previas de eliminación de estructuras, líneas/pianos duplicados, meta/checkpoints lógicos, visor de fotografía y acercamiento de spawn**. Play Store 1.1.188 intacta; ningún APK.
