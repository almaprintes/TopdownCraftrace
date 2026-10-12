# Environment Studio · Pluma de colisiones Bézier (DEV 1.2.124)

La pluma de colisiones añade líneas **físicas invisibles** al proyecto Environment Studio; no modifica píxeles, geometría del circuito, física de los coches ni código de Track Studio.

## Uso
1. Abrir un circuito desde Environment Studio y tocar **✒ COL** o **✒ NUEVA LÍNEA**.
2. Tocar para añadir un vértice, tocar en otra ubicación para seguir una línea recta.
3. Tocar, mantener y arrastrar al colocar un vértice para crear una curva Bézier con tangentes simétricas (estilo pluma Photoshop).
4. Repetir tantos nodos como se necesiten. «ÚLTIMO NODO» corrige el trazo en curso; «CANCELAR» lo descarta.
5. Pulsar **TERMINAR** para incorporar la línea al proyecto (dos nodos como mínimo).
6. En modo edición, arrastrar los nodos amarillos o las tangentes azules. Un primer toque en otra línea la selecciona; el siguiente sobre su curva inserta un nodo sin alterar la forma.
7. **GUARDAR** conserva el proyecto en el navegador; **EXPORTAR** genera el JSON con `collisionLines`. Para que las colisiones entren en el juego desplegado, se debe subir el JSON exportado a `src/game/tracks/library/<track-id>/<track-id>.environment.json` y publicar una DEV posterior.

## Implementación
- Los nodos `{x,y,in:{x,y},out:{x,y}}` describen cúbicas por tramo.
- `src/game/environment/CollisionPenGeometry.js` permite interpolar, insertar nodos (De Casteljau) y muestrear el trazado.
- `src/game/scenes/EnvironmentBuilderCollisionPenScene.js` gestiona interfaz, puntero, edición y persistencia.
- `src/game/scenes/raceEnvironmentRuntime.js` carga segmentos físicos discretizados de las líneas `collisionLines` con grosor mínimo; no genera sprites ni decoración.
- El algoritmo usa límites espaciales sencillos para saltar las colisiones alejadas del coche antes de resolverlas.
- «BORRAR TODO» incluye colisiones editables sin tocar el trazado oficial.

## Límites
Hasta 250 nodos por línea. El ajuste físico actual usa `halfThickness=9` píxeles de mundo. Las líneas no bloquean ni crean trayectorias de carrera por sí mismas: solo actúan como barreras físicas después de publicar el archivo del entorno. Revisar visualmente en iPhone antes de publicar en Android.
