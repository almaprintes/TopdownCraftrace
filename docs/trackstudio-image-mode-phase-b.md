# Top Down RACE — TrackStudio Image Mode Fase B · DEV 1.2.100

Fecha: 2026-10-10. Rama única: `main`. Publicación pública Android 1.1.188 intacta.

## Objetivo
Permitir convertir una centerline ya terminada en una **forma de asfalto editable**, con dos bordes Bézier independientes, manteniendo la foto y todos los nodos centrales originales.

## Funciones
- Botón **CREAR PISTA** situado en la parte superior izquierda del viewport del editor, no fuera de la pantalla en la barra horizontal.
- Calcula el borde izquierdo turquesa y derecho amarillo usando la normal de cada nodo central y el ancho provisional.
- Botón **AJUSTAR** alterna entre edición del eje central y edición de los bordes. En modo AJUSTAR, los clics en vacío nunca añaden nodos a la centerline.
- Arrastre independiente de un nodo del borde, conservando el desplazamiento de sus handles, o arrastre de un handle individual para adecuarlo a la curva.
- Botón **+ NODO** divide exactamente la curva Bézier siguiente del borde seleccionado mediante de Casteljau (sin cambiar la curva actual ni el otro borde). Si el nodo es el extremo final de un tramo, divide el tramo anterior.
- **CREAR PISTA** con forma ya existente requiere confirmación antes de regenerar y descartar los ajustes de la forma. Nunca modifica la centerline.
- Guardado, recuperación automática, deshacer y rehacer incluyen la forma editable. El archivo portable `.tdrtrack` contiene `editor.trackShape` y `gameTrack.trackShape` además de la imagen y de la centerline.
- Un circuito cerrado heredado con `raceType:'stage'` se normaliza como `circuit` al convertir o restaurar. Los tramos abiertos siguen siendo `stage`.
- En el editor, la forma nueva se superpone translúcida a la imagen, sin repintar el ribbon uniforme anterior.

## Limitación explícita
Fase B prepara la forma y la guarda tanto para edición como para la integración posterior. **La conducción no usa aún los bordes independientes**; integrarlo con la detección de suelo y la foto en la carrera es la Fase C. Se conservan física, circuitos públicos y clasificaciones.

## Comprobaciones
- 30 nodos simulados, generación de 30 nodos por borde; edición izquierda no altera derecha ni centerline.
- División exacta del segmento Bézier, serialización, snapshots y conexiones con el editor.
- Prueba manual en iPhone: importar el `.tdrtrack` original (si no está guardado en la PWA), abrir, pulsar CREAR PISTA, activar AJUSTAR, mover nodos/handles e insertar nodos. Guardar y volver a abrir. Verificar imagen, centerline y bordes coincidentes con el archivo previo.
- No sobrescribir nunca el `.tdrtrack` original. Crear uno nuevo desde la DEV 1.2.100.
