# Continuidad — 2026-08-27 — Fabricación: requisitos en una sola fila

## Problema observado
En Fabricación Directa, la tarjeta de receta mostraba cada material requerido en una fila vertical con nombre, cantidad y barra de progreso. En iPhone SE las recetas largas podían perder la última línea por debajo. En Android, según relación de aspecto/altura disponible, el bloque podía resultar todavía peor y apenas cabía una línea visible.

## Decisión UX
Eliminar las barras de progreso verticales del bloque de requisitos. La información útil es `tienes / necesitas`, no la longitud de una barra.

La receta se representa ahora en UNA SOLA FILA HORIZONTAL de celdas, una por material. Cada celda muestra:
- nombre del material;
- cantidad `tienes / necesitas`;
- estado `LISTO` en verde si alcanza;
- `FALTAN X` en rojo si no alcanza.

El botón inferior permanece fijo y resume si se puede fabricar o cuántos materiales distintos faltan.

Objetivo: que incluso recetas de 4–5 materiales permanezcan completamente visibles en iPhone pequeño y Android sin empujar contenido fuera de la tarjeta.

## Implementación
Nuevo override aislado:
- `src/game/scenes/UpgradeWorkshopCompactRecipeScene.js`

Cadena activa actualizada:
- `UpgradeWorkshopCarUnlockScene.js` ahora hereda de `UpgradeWorkshopCompactRecipeScene.js`.

No se modifica:
- `DIRECT_CRAFT_RECIPES`;
- cantidades/costes;
- inventario;
- lógica de `_craftDirect`;
- lógica de desbloqueos/equipado.

Solo cambia la representación visual de `_recipeCard()`.

Commits:
- creación del layout compacto: `8e88584287457182d92a32cace8452ce3b5ec077`;
- conexión al flujo activo: `43f38c39042dc1ab055243cd751e13e974ef93e2`.

## Validación pendiente
Probar al menos:
1. receta corta Street;
2. receta larga Prototype;
3. iPhone SE / viewport compacto;
4. Android con relación de aspecto de la captura del 27/08.

Comprobar especialmente que los textos no se solapen en celdas estrechas y que la imagen de la pieza conserve tamaño suficiente.
