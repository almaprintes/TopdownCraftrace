# Continuidad — 2026-08-27 — Fabricación: requisitos en una sola fila

## Problema observado
En Fabricación Directa, la tarjeta de receta mostraba cada material requerido en una fila vertical con nombre, cantidad y barra de progreso. En iPhone SE las recetas largas podían perder la última línea por debajo. En Android, según relación de aspecto/altura disponible, el bloque podía resultar todavía peor y apenas cabía una línea visible.

## Decisión UX
Eliminar las barras de progreso verticales del bloque de requisitos. La receta se representa en UNA SOLA FILA HORIZONTAL de celdas, una por material.

Tras la primera prueba, la fila compacta resolvió el espacio pero necesitaba más legibilidad y una lectura visual más inmediata del progreso. Se decidió tratar cada minitarjeta como un depósito/vaso vertical:
- el nivel de llenado representa el porcentaje real `tienes / necesitas`;
- 0% = depósito vacío, contorno rojo;
- progreso bajo = rojo;
- progreso medio = transición hacia ámbar;
- progreso alto = transición ámbar → verde;
- 100% o más = depósito lleno y verde;
- el porcentaje se muestra grande;
- también se mantiene `tienes / necesitas`;
- abajo aparece `LISTO` o `FALTAN X`.

El color se interpola continuamente con esquema semáforo rojo → ámbar → verde, no mediante tres estados bruscos. El nivel visual se limita a 100%, aunque la cifra textual puede indicar que se posee más de lo necesario.

## Legibilidad
La información textual va por encima del relleno y se ha reforzado:
- nombre del material en blanco y negrita;
- porcentaje más grande y coloreado con el estado;
- `tienes / necesitas` en blanco fuerte;
- estado inferior con alto contraste;
- sombra oscura para evitar que el relleno reduzca legibilidad.

## Redistribución vertical
El botón `FABRICAR` / `FALTAN X MATERIALES` ya no ocupa una franja horizontal debajo de los vasos. Se ha estrechado al ancho de la columna de la pieza y colocado justo debajo de la imagen de la pieza a fabricar.

Esto aprovecha el espacio que quedaba infrautilizado bajo la pieza y permite que la fila de depósitos utilice toda la altura disponible hasta el borde inferior de la tarjeta. Resultado buscado: vasos sensiblemente más altos y legibles sin aumentar la altura total del panel.

## Implementación
Override aislado:
- `src/game/scenes/UpgradeWorkshopCompactRecipeScene.js`

Cadena activa:
- `UpgradeWorkshopCarUnlockScene.js` hereda de `UpgradeWorkshopCompactRecipeScene.js`.

No se modifica:
- `DIRECT_CRAFT_RECIPES`;
- cantidades/costes;
- inventario;
- lógica de `_craftDirect`;
- lógica de desbloqueos/equipado.

Solo cambia la representación visual de `_recipeCard()`.

Commits:
- creación del layout compacto: `8e88584287457182d92a32cace8452ce3b5ec077`;
- conexión al flujo activo: `43f38c39042dc1ab055243cd751e13e974ef93e2`;
- depósitos porcentuales rojo→ámbar→verde + mejora de legibilidad: `f752ecdb8d247f388eddb2ee1992a46d08cb4aa2`;
- botón de fabricación trasladado bajo la pieza y vasos extendidos verticalmente: `a4b7ae6db32e819bd991736ad426ca76c9cd41c7`.

## Validación pendiente
Probar al menos:
1. receta corta Street;
2. receta larga Prototype;
3. iPhone SE / viewport compacto;
4. Android con relación de aspecto de la captura del 27/08.

Comprobar especialmente:
- que el nivel de llenado sea intuitivo;
- que las celdas estrechas sigan siendo legibles;
- que los porcentajes cercanos a 50% se perciban ámbar;
- que 100% quede lleno y verde;
- que la imagen de la pieza conserve tamaño suficiente;
- que el botón bajo la pieza sea cómodo de pulsar y su texto no se comprima demasiado.
