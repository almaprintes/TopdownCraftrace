# TrackStudio 2.0 — puntos guía flexibles para la trazada de la IA

**Origen:** propuesta del creador el 21 de noviembre de 2026, tras la prueba LIVE 4 de Santa Cruz/Gripline.
**Estado:** diseño propuesto, **no implementado**, sin efecto en carreras existentes.
**Prioridad:** sustituir la búsqueda exclusivamente automática de vértices como primera vía de mejora **en circuitos creados/editados manualmente**; mantener línea calculada para circuitos sin ayudas.

## 1. Idea esencial

El autor de un circuito puede colocar **puntos de vértice sugeridos** dentro del asfalto para indicar:

> «La trayectoria rápida debería acercarse a esta zona de la curva, pero no es una línea obligatoria».

No son checkpoints, no generan invalidaciones de vuelta, no obligan a atravesar una coordenada exacta, no teleportan el coche y no sobreescriben el mando. Son **restricciones blandas** (soft constraints) para el optimizador de trayectoria; el controlador sigue conducido por las mismas físicas que el jugador.

La propuesta es técnicamente más rápida de validar en un circuito conocido como Santa Cruz que desarrollar de entrada un planificador global perfecto. **No demuestra por sí sola** que la IA supere su 1:08–1:09 ni resuelve el error de seguimiento del 18 %. Es una ayuda del autor que requiere validación y un controlador capaz de ejecutarla.

## 2. Flujo de usuario recomendado en TrackStudio

**Nombre de herramienta:** `VÉRTICES IA` o `GUÍAS IA`; mostrarla entre las herramientas de trazado, no dentro del selector de checkpoints.

1. Abrir circuito en TrackStudio y pulsar **GUÍAS IA**.
2. Tocar cerca del vértice ideal de una curva. Se crea una **marca circular** con zona de influencia translúcida sobre la fotografía. No debe reemplazar nodos del eje ni mover bordes Bézier.
3. Arrastrar la marca para reposicionarla; dos parámetros sencillos: **influencia** (suave / media / alta) y **zona admitida** (radio de tolerancia). La IA puede pasar a cualquier posición razonable dentro de esa zona.
4. Modificar/eliminar puntos, deshacer/rehacer, guardar el proyecto y exportar .tdrtrack. El circuito sigue siendo editable incluso si no tiene guías.
5. En **PROBAR** / Realizador A-B, activar `GUIADA` para comparar línea automática, línea sugerida y recorrido físico sobre el mismo circuito, con FPS y tiempo por IA.
6. No activar en LIVE 4 competitivo hasta pruebas físicas y seguridad con los bordes.

### Visualización
- Punto de vértice: círculo naranja con número, pequeño para no tapar la curva.
- Influencia: área semitransparente amarilla, independiente del zoom.
- Línea A: referencia automática actual.
- Línea guiada: línea del optimizador con atracción suave.
- Estela real: posición física de cada IA en carrera.
- Mostrar advertencia si una guía queda fuera del asfalto, en sentido equivocado o en zona con bordes desconocidos.

## 3. Datos propuestos (no crear campos fuera del versionado)

Proyecto editor: `aiLineGuides: {version:1,points:[...]}`; exportación al gameTrack en la misma estructura.

Cada punto:
- `id`: identificador estable (único dentro del circuito).
- `x,y`: posición de la guía en coordenadas del mundo TrackStudio (fotografía), no coordenadas de pantalla.
- `kind:"apex"` inicialmente; reservar futuro `entry`, `exit` si algún tramo exige más ayuda.
- `radiusPx`: distancia de tolerancia o banda de influencia, proporcional a la anchura local (valor por defecto ligado al ancho local, no constante para todos los circuitos).
- `strength`: influencia entre 0 y 1, valor predeterminado ~0.65; **no equivale a obligación absoluta**.
- `direction`: sentido de carrera homologado; no aplicar a inversa sin reproyección y comprobación.

**No guardar una polilínea óptima completa** como única ruta del circuito. El juego siempre debe poder recalcular otras trayectorias alrededor de las guías. Máximo inicial recomendado 32 guías por circuito, modificable tras pruebas.

## 4. Algoritmo propuesto

1. Verificar centroline, dirección y bordes reales. Proyectar cada punto de guía sobre la sección apropiada del eje; resolver la lateralidad firmada y **distancia longitudinal de pista**, evitando elegir un brazo próximo de otra horquilla.
2. Construir una función de coste que premie acercarse al área flexible de la guía, suavice curvatura, penalice salirse de los bordes y respete radio físico del coche y margen de control.
3. Distribuir desplazamiento entre **entrada exterior → vértice interior → salida exterior** mediante transición continua. El punto de vértice orienta el centro de la maniobra, no define por sí solo los puntos exactos de entrada y salida.
4. Interpolar únicamente dentro del corredor seguro conocido. **Si faltan bordes o hay inconsistencias, reducir ambición o descartar esa guía; nunca inventar anchura segura.**
5. Perfil de velocidad y volante calculados con aceleración, giro, freno, agarre y velocidad máxima iguales a los del jugador. No tocar parámetros físicos para simular una mejora.
6. Variabilidad entre pilotos: misma recomendación, pero cada IA puede escoger offset ligeramente diferente dentro de la zona por estilo, tráfico, ataque/defensa y condiciones. Evitar que las cuatro IA sigan una trayectoria clonada.

**Coste conceptualmente:** `coste = pesoA*distanciaFueraDeZona² + pesoB*curvatura² + pesoC*riesgoBorde + pesoD*velocidadNoFactible`.
No implementar esto como un resorte que arrastre el coche en cada fotograma: la guía forma parte del plan de trayectoria calculado **antes** de la carrera.

## 5. Compatibilidad técnica con el repositorio

Inspección del código vigente, 21/11/2026:
- `src/game/scenes/TrackStudioScene.js` conserva `_nodes` y exporta `_getProjectData()` y `_exportToGameTrack()`.
- `src/game/studio/installTrackShapeEditor.js` ya envuelve las funciones de guardado/carga, importación y render para añadir `trackShape`. Añadir el nuevo metadato mediante una capa independiente o integración atómica; preservar los datos antiguos.
- `src/game/studio/trackStudioLabChrome.js` contiene los controles DOM de TrackStudio 2.0 y un mecanismo de acciones que evita mutaciones frecuentes del texto Phaser en iPhone.
- `src/game/ai/trackRacingLinePlanner.js` optimiza actualmente sobre eje y ancho estimado.
- `src/game/online/craftraceLiveV2BotDirector.js` usa la trayectoria A en LIVE 4; la variante B está aislada en Realizador. El futuro modo `GUIADA` debe permanecer aislado hasta validación.
- `scripts/install-santa-cruz-source.mjs` reconstruye `track.json` desde el `.tdrtrack` oficial; **deberá preservar expresamente el nuevo campo** antes de probarlo en la versión fotográfica. No modificar ni sustituir el paquete original sin una edición autorizada del circuito.

## 6. Evidencia y límites actuales

Captura 21/11/2026, 11:05:
- Piloto humano: 0:59.116/3 vueltas.
- IA Experto: 1:08.400, 1:09.000, 1:09.350.
- Objetivo lateral A ~13 %; lateral real ~10 %; error lateral firmado de seguimiento ~18 % (del semiancho útil **estimado**).
- 60 FPS; 0 hitches y 0.00 s de tiempo no integrado.
- La IA planea una línea poco ambiciosa, pero tampoco la sigue perfectamente.

La primera versión del experimento con límites de bordes Bézier automáticos encontró secciones válidas en aproximadamente **89 %** de las muestras del circuito fotográfico de Santa Cruz; el criterio de seguridad exigía >=95 %, por lo que **no pasó CI y no se desplegó**. El ensayo se revirtió. Los puntos guía no eliminan la necesidad de validar bordes y física: deben tratarse como guía, nunca como licencia para cruzar el exterior de la calzada.

## 7. Entrega incremental y criterios de aceptación

**Etapa A — editor, sin riesgo para carreras:** herramienta para añadir, mover, borrar y guardar puntos; visualización, deshacer, exportación/importación .tdrtrack y recuperación en iPhone; garantizar que un proyecto sin puntos exporta exactamente el mismo circuito.

**Etapa B — planificador aislado:** `A / GUIADA` en Realizador local de 4 IA. Medir distancias a la banda sugerida, error de seguimiento, bordes reales, tiempo real y estabilidad. Si un sector no admite la banda de la guía, indicar qué guía falla sin modificar asfalto/centroline.

**Etapa C — pruebas de conducción:** Santa Cruz y al menos otro circuito de curvas; comprobar exterior-apex-exterior visualmente y físicamente, cruces de meta, 60/30/15 FPS, coches diversos y ausencia de cortes de pista. Los puntos pueden variar sin crear rutas idénticas para todos.

**Etapa D — eventual homologación competitiva:** solo después de CI y pruebas iPhone/Android con 1–3 IA y varios humanos; sin premios oficiales, estadísticas o cambio de versiones comerciales por una prueba.

**Decisión pendiente:** iniciar etapas de implementación del editor y del modo guiado cuando el creador lo solicite explícitamente. Ninguna decisión registrada habilita publicar a Google Play.

## 21/11/2026 — Etapa A implementada en DEV

La herramienta **GUÍAS IA** se integra en la barra de acciones de TrackStudio. Permite crear una guía tocando el lienzo, seleccionar y mover la guía con un gesto posterior, ajustar fuerza y radio con botones grandes, borrar, deshacer/rehacer y guardar. Los gráficos se dibujan por separado de los nodos Bézier. Hasta 32 guías por circuito, con datos normalizados.

El campo opcional `aiLineGuides:{version:1,points:[...]}` se incluye tanto en el editor como en `gameTrack` y viaja en el archivo fotográfico `.tdrtrack`. No se escribe este campo para circuitos sin guías. El reescalado de la imagen conserva las posiciones y aumenta el radio proporcionalmente.

**No activa conducción guiada:** ni el Realizador ni LIVE 4 interpretan este campo todavía. El siguiente paso es comparar líneas guiadas en el Realizador, verificando la seguridad de los bordes antes de promoverlas. Ninguna física, premio o récord se altera.

## 21/11/2026 — Exportación fiable desde iPhone

Se observó que el creador pudo colocar y guardar 12 guías en TrackStudio, pero la descarga automática de .tdrtrack desde GUARDAR no estaba disponible. La antigua exportación leía de manera asincrónica la foto en IndexedDB antes de intentar una descarga automática; Safari/PWA puede perder la activación del usuario y el mensaje de guardado no demuestra que el fichero esté en Archivos.

Solución DEV: un botón EXPORTAR junto a GUARDAR abre un diálogo que prepara el proyecto completo (editor, gameTrack, guías y fotografía). Una segunda pulsación explícita permite COMPARTIR / GUARDAR EN ARCHIVOS de iOS mediante Web Share cuando se admiten archivos, o DESCARGAR ARCHIVO con un enlace real. Se indica nombre, tamaño y cantidad de guías, sin afirmar que la descarga se haya completado antes de confirmación de iOS.

Para circuitos con fotografía, GUARDAR conserva una copia local, y EXPORTAR permite crear el fichero portable .tdrtrack. Si falta la imagen maestra, se ofrece un JSON de recuperación que conserva la geometría y los puntos, con un aviso explícito de que no contiene foto. Los archivos sin fotografía siguen usando JSON. No hay cambios de IA, física ni online.

Pruebas incluidas: scripts/trackstudio-iphone-export-smoke.mjs, validación de ida y vuelta del paquete con 12 puntos de vértice, JSON de rescate y separación guardado/exportación.
