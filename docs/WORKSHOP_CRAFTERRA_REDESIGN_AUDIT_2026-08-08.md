# Auditoría Workshop y rediseño inspirado en CRAF TERRA

Fecha: 2026-08-08

## Diagnóstico del sistema anterior

El Workshop funcionaba como una interfaz de tres paneles con dos slots A/B. La interacción de arrastre se añadió encima de una UI que originalmente estaba diseñada para selección por pulsación. Eso produjo varios problemas:

1. El gesto dependía de `Phaser.Input.setDraggable()` sobre Containers y Zones distintos, con comportamientos diferentes entre tarjetas, slots y piezas.
2. El drop se resolvía comparando la coordenada final del puntero con rectángulos estrechos. En móvil, un drag correcto visualmente podía fallar por pocos píxeles.
3. Los slots A/B convertían el crafting en un formulario: escoger A, escoger B, pulsar FUSIONAR. El arrastre era accesorio, no la mecánica central.
4. Para mover un objeto ya colocado se arrastraba un Zone invisible, mientras el dibujo permanecía estático. Esto rompe la correspondencia dedo-objeto y da sensación de fallo.
5. Cada drop terminaba reconstruyendo toda la escena. Aunque barato en esta escala, hacía más difícil mantener continuidad visual durante el gesto.
6. Montar piezas usaba una lógica distinta a fusionar materiales, obligando a aprender dos interacciones.
7. La UI daba demasiado protagonismo a paneles, estadísticas y texto, y demasiado poco a objetos físicos reconocibles.

## Fundamento adoptado de CRAF TERRA

El nuevo Workshop trata el crafting como manipulación espacial:

- El inventario es una fuente de objetos.
- La mesa central es un espacio libre, no dos casillas.
- Arrastrar un objeto desde la mochila lo coloca físicamente en la mesa.
- Los objetos colocados permanecen y pueden moverse libremente.
- La fusión ocurre al arrastrar un objeto SOBRE otro objeto compatible.
- Si no hay receta, ambos objetos permanecen y se informa con feedback corto.
- Los resultados aparecen en el mismo punto de la mesa, sustituyendo a los ingredientes.
- Los componentes intermedios pueden volver a fusionarse sin abandonar la mesa.
- Las piezas terminadas se arrastran directamente desde la mesa o la mochila al hueco correcto del coche.
- Sacar un objeto fuera de la mesa lo devuelve al inventario visualmente; no se pierde.

Esto convierte el crafting en una mecánica táctil y no en una pantalla de configuración.

## Arquitectura de interacción nueva

Archivo activo: `src/game/scenes/UpgradeWorkshopCrafterraScene.js`

La escena deja de usar el sistema `setDraggable` como núcleo y centraliza el gesto:

- `pointerdown`: inicia un único estado de drag.
- `pointermove`: el objeto visual sigue directamente al dedo.
- `pointerup`: resuelve una sola vez el destino.

Tipos de origen:

- `inventory`: crea una representación temporal y, si se suelta sobre la mesa, crea un token persistente.
- `token`: mueve el token real de la mesa y al soltar decide entre fusionar, equipar, recolocar o devolver.

No existen slots A/B.

## Reglas de fusión

1. Dos tokens se consideran candidatos cuando sus centros terminan a menos de ~82 px.
2. `findRecipe(a,b)` sigue siendo la única fuente de verdad para recetas.
3. `craft()` sigue siendo la única función que consume inventario y produce el resultado.
4. Tras una fusión correcta se eliminan los dos tokens visuales y aparece el resultado en su punto medio.
5. Se conservan las cadenas de crafting: un resultado de tipo `component` puede fusionarse de nuevo.
6. La mesa no permite reservar visualmente más unidades de un material de las que existen realmente en inventario.

## Montaje del coche

Los cinco destinos continúan siendo:

- Motor
- Frenos
- Ruedas
- Suspensión
- Caja

Una pieza solo se equipa al soltarla sobre la zona de su propia familia. `equip(state,id,carId)` continúa siendo la función autoritativa, por lo que el loadout sigue siendo independiente por coche.

## Dirección visual

La pantalla deja atrás el lenguaje de simulador técnico:

- mesa central grande y protagonista;
- objetos representados como piezas mecánicas reconocibles;
- paneles relegados a marco visual;
- coche visto desde arriba como zona física de montaje;
- estadísticas reducidas a una pequeña lectura de efecto real;
- feedback breve de fusión y montaje;
- colores arcade sobre materiales semirrealistas.

## Regla para futuras iteraciones

No volver a introducir selección A/B como flujo principal. El Workshop debe poder entenderse observando la pantalla sin leer un manual:

**coger → soltar → juntar → transformar → montar.**

Los siguientes cambios deben mejorar esa cadena, no añadir formularios alrededor de ella.
