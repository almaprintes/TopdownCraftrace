# Fabricación móvil: límites DOM / Phaser — 2026-09-01

## Motivo

Durante las pruebas de Fabricación en móvil aparecieron interfaces duplicadas y desalineadas: una capa DOM nueva convivía con controles, textos o modales heredados de Phaser. El problema no era simplemente visual: dos sistemas de layout y ciclo de vida distintos quedaban activos a la vez.

Regla acordada para móvil: **la interfaz visible de Fabricación debe ser DOM/CSS nativo. No debe mezclarse con `Phaser.Text`, gráficos Phaser usados como UI ni `Phaser.DOMElement` posicionado con coordenadas Phaser.** Phaser puede seguir siendo motor de escena/estado y cargar recursos, pero no debe dibujar una segunda interfaz visible debajo del DOM.

## Punto final de la cadena móvil

La clase final que debe interceptar los comportamientos heredados para la versión móvil es:

`src/game/scenes/UpgradeWorkshopCarUnlockScene.js`

Esta clase importa la cadena anterior desde `UpgradeWorkshopLowHeightRecipeScene.js` y decide si se usa la superficie DOM móvil mediante `_nativeWorkshopDomEnabled()`.

Cuando el DOM móvil está activo:

- `render()` delega en `renderWorkshopMobileDom(this)`;
- `_openQuickFamilyInstall()` debe delegar en `openWorkshopQuickInstallDom()`;
- `_openCraftedPartModal()` debe delegar en `openWorkshopCraftedPartDom()`;
- `_toast()` debe delegar en `showWorkshopMobileToast()`;
- el reciclaje se abre con `openMaterialExchangeDom()`;
- al hacer `shutdown` se deben cerrar diálogos, superficie de Fabricación y reciclaje DOM.

Esto es importante: **los overrides deben hacerse en esta clase final**, no en una clase intermedia, salvo que se quiera cambiar también el comportamiento desktop/legacy.

## Cadena de herencia relevante

La ruta que acabó siendo importante durante la depuración es, de arriba hacia las capas heredadas:

`UpgradeWorkshopCarUnlockScene`
→ `UpgradeWorkshopLowHeightRecipeScene`
→ capas compactas / sizing
→ `UpgradeWorkshopQuickInstallScene`
→ `UpgradeWorkshopStatSegmentsScene`
→ `UpgradeWorkshopCoinAssetScene`
→ `UpgradeWorkshopInventoryAccessScene`
→ `UpgradeWorkshopEvolutionGuardScene`
→ `UpgradeWorkshopSimpleCraftScene`
→ capas anteriores de Workshop

No asumir que un método visible en una clase intermedia es el último que se ejecuta. Hay que comprobar la clase final registrada por el juego y la resolución real del método.

## Puntos calientes / fuente de verdad

### `_craftDirect(out, recipe)`

Definido en `UpgradeWorkshopSimpleCraftScene.js`.

Responsabilidad real:

1. valida materiales;
2. consume materiales;
3. añade la pieza fabricada al inventario;
4. registra descubrimiento;
5. guarda Garage;
6. renderiza;
7. llama a `_openCraftedPartModal(out)` mediante `delayedCall(0, ...)`.

**No hay que duplicar esta lógica en DOM.** El DOM solo presenta decisiones al usuario.

### `_openCraftedPartModal(id)`

La implementación heredada de `UpgradeWorkshopSimpleCraftScene.js` crea un modal Phaser completo con `container`, rectángulos y `this.add.text()`. Es el origen exacto del cuadro:

- `PIEZA FABRICADA`;
- nombre/arte de pieza;
- `GUARDADA EN TU INVENTARIO`;
- pieza instalada actualmente;
- `GUARDAR`;
- `INSTALAR AHORA`.

En móvil DOM **no debe ejecutarse esa implementación**. `UpgradeWorkshopCarUnlockScene.js` debe interceptarla y llamar a `openWorkshopCraftedPartDom(scene, id)`.

### `_installCraftedPart(id)`

Definido en `UpgradeWorkshopSimpleCraftScene.js`.

Es la fuente de verdad para instalar la pieza recién fabricada:

- resta la nueva del inventario;
- devuelve al inventario la anterior del mismo slot si existe;
- actualiza `equippedByCar`;
- guarda Garage.

El modal DOM debe llamar a este método, no reimplementar la mutación del inventario.

### `_openQuickFamilyInstall(family)`

La implementación heredada en `UpgradeWorkshopQuickInstallScene.js` es un modal Phaser. En móvil debe interceptarse en la clase final y sustituirse por `openWorkshopQuickInstallDom()`.

### `_familyDock(...)`

El dock inferior original vive en `UpgradeWorkshopQuickInstallScene.js`. Su comportamiento —familia, pieza instalada, tier, instalar/cambiar— es la referencia funcional que debe reproducir el DOM.

### Stats segmentados

La lógica original de las barras de rendimiento está en `UpgradeWorkshopStatSegmentsScene.js`.

El comportamiento que debe conservar el DOM:

- valor base del coche en blanco;
- contribuciones de piezas equipadas por familia;
- color por tier: T1 azul, T2 verde, T3 morado, T4 dorado;
- mismos cálculos de `statDeltaForPart` / piezas equipadas que usa la versión original.

No aproximar visualmente ni inventar una lógica paralela.

## Módulos DOM actuales

- `src/game/ui/WorkshopMobileDom.js`: superficie principal de Fabricación móvil.
- `src/game/ui/WorkshopMobileDialogsDom.js`: selector rápido, modal post-fabricado y toast móvil.
- `src/game/ui/MaterialExchangeFlexibleDom.js`: reciclaje/intercambio de materiales.

Los modales DOM deben anclarse al padre del canvas / `#app`, usar CSS y limpiarse al cerrar o al salir de la escena.

## Comportamiento funcional que no debe cambiar

La referencia de producto sigue siendo:

**FABRICAR → la pieza entra en INVENTARIO → el jugador decide GUARDAR o INSTALAR.**

Fabricar no instala automáticamente. Solo puede existir una pieza equipada por familia/slot. Si se instala otra, la anterior vuelve al inventario.

## Errores cometidos y aprendizaje

1. Convertir `Phaser.Text` a DOM manteniendo coordenadas Phaser no soluciona el problema: sigue habiendo dos sistemas de layout.
2. Rehacer la pantalla principal DOM pero olvidar modales heredados deja rutas de escape hacia Phaser.
3. Un override en una clase incorrecta puede existir en el código y no ejecutarse nunca.
4. Antes de afirmar que un cambio está activo hay que verificar:
   - clase final usada;
   - método efectivo que se resuelve;
   - build de `develop` incluida realmente en `/dev/`.
5. Para conservar comportamiento, **`main` es la referencia UX/lógica**; `develop` debe reproducirlo en DOM sin inventar estados nuevos.

## Despliegue de pruebas

- `main` alimenta la beta raíz.
- `develop` se empaqueta bajo `/dev/`.
- Pages se dispara desde `main`; para reconstruir `/dev/` sin fusionar develop se modifica `.github/preview-trigger.txt` en `main`.
- No fusionar cambios de Fabricación a `main` hasta que estén verificados en `/dev/`.
