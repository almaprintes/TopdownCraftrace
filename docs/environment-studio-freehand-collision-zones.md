# Environment Studio · Zonas de colisión a mano alzada

**DEV 1.2.126 (mejoras de flujo).** Herramienta diseñada para dibujar áreas sólidas sobre arboledas, edificios, conjuntos de neumáticos y otras zonas que un coche no puede atravesar. No modifica los píxeles de la fotografía ni las físicas generales.

## Trabajo en el editor

1. En Environment Studio abre el circuito (por ejemplo Karting Tenerife).
2. Elige **▱ ZONA** en la barra izquierda, o **✎ MANO ALZADA** en el panel **ZONAS · COLISIÓN**.
3. Mantén el dedo y dibuja una parte del contorno. Al levantarlo **no se cierra**: puedes seguir dibujando en otro gesto. Un toque sin arrastrar no crea puntos.
4. Para moverte, pulsa **✋ MOVER MAPA** o **PAN** y desplázate o haz zoom. Pulsa **✎ CONTINUAR** para seguir añadiendo trazos donde lo dejaste. **↶ DESHACER** quita el último trazo, sin borrar el resto. Al terminar el contorno pulsa **✓ TERMINAR ZONA** para cerrar el polígono. Puedes crear después más zonas. Se muestran semitransparentes solo en el editor.
5. **EDITAR ZONAS** vuelve a selección. Toca el interior de una zona para seleccionarla. Arrastra por su interior para desplazarla; arrastra un punto amarillo para corregir una esquina. Una figura que se autoatraviese no puede guardarse.
6. **BORRAR ZONA** borra solo el polígono seleccionado. **CANCELAR TRAZO** abandona un dibujo empezado.
7. **GUARDAR** conserva el proyecto en el navegador; **EXPORTAR** incluye el arreglo `collisionZones` en el `*.environment.json`.

### Cómo activarlo en carrera

Tras exportar, subir el JSON a la ubicación indicada por Environment Studio, por ejemplo:
`src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json`.

Después debe realizarse un nuevo Build + Deploy en main. Los cambios guardados solo en localStorage **no** se comparten automáticamente con el juego.

## Geometría y rendimiento

- Persistencia: `collisionZones:[{id,solid:true,points:[{x,y},...]}]`.
- Los puntos están en coordenadas de mundo sin reescalados.
- El trazo se simplifica antes de guardarse, con un máximo de 180 vértices por polígono.
- Se comprueba la superficie y la ausencia de autointersecciones.
- En carrera se compila una caja de límites por zona. Si el coche queda lejos, no se recorren sus vértices.
- Al rozar el perímetro se separa el vehículo. Si aparece dentro se desplaza al exterior siguiendo el borde más próximo. Se elimina el componente de velocidad que penetraría la zona.
- La colisión aplica al jugador y a los coches controlados por la IA. Las zonas no se renderizan en carrera ni colocan sprites.
- La pluma Bézier para colisiones lineales y las antiguas barreras permanecen disponibles.

### Limitaciones

La herramienta no crea huecos interiores: una figura es una zona sólida cerrada. Rodea cada arboleda por separado en lugar de dibujar una sola zona que incluya una carretera. Al editar se permite desplazar un área y modificar vértices, pero no agujeros ni polígonos multiparte. Probar la zona en el circuito tras exportar y desplegar el JSON.
