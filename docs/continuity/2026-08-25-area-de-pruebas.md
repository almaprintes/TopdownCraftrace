# Área de Pruebas — modo de conducción libre

Fecha: 2026-08-25

## Decisión de producto

`Área de Pruebas` es un **modo de juego**, no un circuito. No debe aparecer en el selector/colección de circuitos ni sustituir la selección normal del jugador.

Objetivo: ofrecer un mundo muy grande, diáfano y barato en recursos para practicar conducción, probar controles y configuraciones, comparar coches, alcanzar velocidad punta, derrapar sin miedo a salirse de una pista y experimentar con distintas superficies.

## Reglas del modo

- Sin meta útil para gameplay.
- Sin checkpoints.
- Sin vueltas.
- Sin IA.
- Sin eliminación.
- Sin necesidad de completar nada.
- Mantiene el coche activo, sus piezas, física común BASE y controles elegidos por el jugador.
- Entrar en el modo NO modifica `tdr2:trackKey`; al volver a un modo normal se conserva el circuito previamente seleccionado.
- Identificador del modo: `practice`.
- Mundo técnico interno: `practice-area`.
- `practice-area` está marcado `hiddenFromTrackSelect` y además filtrado en la capa final del garaje de circuitos.

## V1 implementada

Mundo: **7000 × 5000 px**.

El mapa usa deliberadamente muy pocos objetos gráficos:

1. gran zona superior de asfalto;
2. gran explanada inferior izquierda de tierra;
3. gran explanada inferior derecha off-road/césped;
4. una pequeña placa de asfalto dentro del off-road para gymkhana;
5. un único `Graphics` para líneas, marcas, conos y neumáticos simplificados.

No se usan edificios, público, vegetación, gradas ni decoración pesada.

## Superficies físicas

Las zonas no son únicamente visuales. La capa `RacePracticeAreaScene.js` reutiliza el sistema `vehicle × surface` existente.

Mapa de materiales:

- `ASPHALT`: zona superior completa;
- `DIRT`: mitad inferior izquierda;
- `GRASS`: mitad inferior derecha como superficie off-road;
- `ASPHALT`: pad de gymkhana dentro de la zona off-road.

Las zonas se leen desde `track.meta.practiceZones`. Las zonas posteriores tienen prioridad, permitiendo insertar el pad de gymkhana dentro de otra superficie.

No se modifica la física común BASE 1.0. Solo se reutilizan las capacidades ya existentes de cada coche sobre cada material.

## Zona de Velocidad

La gran recta de asfalto ocupa la parte superior del mapa.

Características V1:

- recta extremadamente larga y ancha;
- bordes visuales simples;
- espacio suficiente para estabilizar el coche y buscar velocidad punta;
- serie de marcas transversales progresivamente más próximas al final, inspiradas en las señales visuales de final de calle en una piscina olímpica;
- zona final resaltada como aviso;
- escapatoria amplia: las marcas NO coinciden con el límite físico del mapa para que el jugador tenga margen real de frenado.

La intención es que las franjas se perciban claramente incluso a velocidades muy altas sin necesitar carteles, props o lógica adicional.

## Zonas de práctica

### Asfalto

- velocidad punta;
- frenadas largas;
- donuts;
- círculos amplios de drift;
- cambios de apoyo.

### Tierra

- drift libre;
- freno de mano;
- pérdidas de tracción;
- marcas de neumáticos y comportamiento sobre suelo suelto.

### Off-road / césped

- pérdida de velocidad y agarre;
- control del coche fuera de una superficie favorable;
- transiciones de material.

### Gymkhana

Situada en un extremo para no contaminar el resto del mundo.

V1 muy ligera:

- slalom con conos simplificados;
- segunda línea de obstáculos representados como neumáticos;
- pad de asfalto propio.

Los conos/neumáticos de esta primera versión son primitivas visuales, no una colección pesada de sprites. Colisiones/retos cronometrados pueden añadirse más adelante si aportan valor.

## Spawn

Spawn de práctica actual:

- x: 700
- y: 900
- orientación: 0 rad

Aparece en la zona de asfalto, encarado hacia la Zona de Velocidad.

## UI

`Área de Pruebas` aparece como cuarta tarjeta en el modal de modos de juego:

- CONTRARRELOJ
- FANTASMA
- SUPERVIVENCIA
- ÁREA DE PRUEBAS

Texto de apoyo: `Velocidad · drift · superficies`.

En el mundo aparece un badge discreto: `ÁREA DE PRUEBAS · CONDUCCIÓN LIBRE`.

La lógica de meta/checkpoints y el panel TT se neutralizan en este modo. Los controles normales y el HUD útil de conducción se conservan.

## Arquitectura

Archivos principales:

- `src/game/scenes/MenuGameModesScene.js` — entrada del modo y preservación del circuito seleccionado.
- `src/game/tracks/library/practice-area/track.json` — dimensiones, zonas físicas y spawn técnico.
- `src/game/scenes/RacePracticeAreaScene.js` — mapa visual ligero, reglas libres y selección de superficie por posición.
- `src/game/scenes/TrackGarageHideSpecialScene.js` — exclusión explícita del selector de circuitos.
- `src/game/game.js` — activa las capas finales anteriores.

## Regla de rendimiento

Este modo debe mantenerse como uno de los mapas más baratos del juego.

No introducir en V1:

- chunks visuales numerosos;
- vegetación masiva;
- objetos decorativos repetidos;
- público;
- edificios;
- IA;
- sistemas de misión activos permanentemente.

Si en el futuro se mejora visualmente, preferir bake estático o muy pocos assets grandes antes que decoración procedural cara.

## Evoluciones posibles, NO implementadas todavía

- velocidad máxima de sesión;
- 0–100 km/h;
- distancia de frenado;
- duración/longitud de drift;
- slalom cronometrado opcional;
- retos de precisión;
- selector rápido de coche dentro del Área de Pruebas;
- puntos de teletransporte entre zonas.

Estas mejoras son opcionales. La prioridad inicial es validar en iPhone que el modo sea libre, claro, útil y muy fluido.

## Validación pendiente

No considerar cerrada la V1 hasta comprobar en iPhone:

1. `Área de Pruebas` aparece en Modos de Juego y NO en Circuitos.
2. Entrar/salir conserva el circuito normal seleccionado.
3. No aparecen meta/checkpoints/vueltas funcionales.
4. El coche aparece en la zona de asfalto.
5. Las tres superficies producen diferencias físicas reales.
6. La Zona de Velocidad tiene longitud suficiente para alcanzar velocidad punta.
7. Las marcas progresivas del final se leen bien a alta velocidad.
8. Hay escapatoria suficiente tras los avisos.
9. La gymkhana no molesta al resto del mapa.
10. Rendimiento real en iPhone estable y claramente mejor que un circuito visualmente complejo.
