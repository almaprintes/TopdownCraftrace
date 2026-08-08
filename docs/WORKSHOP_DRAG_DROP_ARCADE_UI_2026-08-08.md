# Workshop drag & drop + lenguaje visual arcade

Fecha: 2026-08-08

## Objetivo

El Workshop deja de comportarse como un formulario/simulador y pasa a sentirse como una pantalla de videojuego arcade semirrealista.

## Interacción obligatoria

- Los materiales del almacén se **arrastran** a los slots A/B del banco de fusión.
- Las piezas fabricadas se **arrastran** desde ALMACÉN → PIEZAS hasta su hueco compatible del coche.
- Ya no se equipa una pieza mediante un botón `EQUIPAR`.
- Un slot A/B ocupado se puede vaciar tocándolo.
- También se puede arrastrar un elemento desde A/B: si se suelta fuera del banco, se elimina de ese slot; si se suelta en el otro slot, se mueve.
- Arrastrar otro material a un slot ocupado lo sustituye.

## Lenguaje visual

Se eliminan los pictogramas Unicode como representación principal de materiales/piezas en el Workshop. La escena dibuja iconos vectoriales propios mediante Phaser Graphics:

- Chatarra: conjunto irregular de tornillos/piezas metálicas.
- Aleación: lingote/placa facetada con reflejo.
- Goma: sección de neumático con dibujo radial.
- Compuesto: pastilla/resina naranja con inclusiones.
- Disco: rotor metálico perforado.
- Muelle: resorte técnico azul.
- Engranaje: rueda dentada metálica.
- ECU: placa electrónica con contactos.
- Pastilla deportiva y bloque preparado: componentes específicos.
- Piezas finales: representaciones diferenciadas de frenos, neumáticos, suspensión, caja y motor.

Los tiers mantienen el color de rareza como acento, pero la silueta del objeto debe ser reconocible incluso sin leer el nombre.

## Principio visual

La referencia no es un configurador industrial. Debe sentirse como un **taller de carreras arcade premium**:

- paneles oscuros con volumen suave;
- acentos verde/cian/amarillo;
- fondos diagonales y lenguaje racing;
- objetos grandes, legibles y manipulables;
- interacción física de arrastrar/soltar;
- datos reales del coche presentes pero secundarios a la experiencia visual.

## Implementación

Commit principal: `22742254`

Archivo: `src/game/scenes/UpgradeWorkshopPerformanceScene.js`

No se modifica la lógica de recetas ni los valores físicos de las piezas en esta fase; se cambia principalmente interacción y presentación.
