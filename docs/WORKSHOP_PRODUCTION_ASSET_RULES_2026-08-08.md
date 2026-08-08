# Workshop — reglas de arte de producción

Fecha: 2026-08-08

## Incidente

La primera implementación visual del Workshop intentó aproximar el mockup premium mediante formas procedurales de Phaser. Aunque la composición se acercaba al objetivo, el resultado tenía aspecto de prototipo/simulador y no alcanzaba el nivel comercial exigido para TDR2.

## Regla de producción

**No usar arte procedural como representación final de coches, materiales o piezas del Workshop.**

El arte procedural puede existir únicamente como fallback de desarrollo temporal y no debe ser la ruta visual activa en builds de evaluación comercial.

### Coches

- Usar los WebP oficiales ya existentes en `assets/cars/runtime/`.
- Compartir exactamente el mismo sistema de naming que el Garaje:
  `card_<carId>_<raritySlug>_<collectionNo>.webp`.
- El Workshop debe cargar el coche seleccionado desde esos assets, nunca redibujarlo con Graphics.

### Materiales y piezas

- Cada material y cada pieza debe tener un asset WebP dedicado, con dirección artística arcade semirrealista coherente.
- Priorizar recortes/derivados aprobados del mockup oficial cuando existan y mantengan calidad suficiente.
- Si un elemento no dispone todavía de WebP de producción, debe tratarse como deuda visual explícita; no considerar la pantalla terminada hasta sustituirlo.
- Mantener una única tabla `itemId -> textureKey/path` para inventario, mesa, recetas y slots equipados. No duplicar arte por pantalla.

### Mesa y entorno

- La mesa de fusión y el fondo de taller deben apoyarse en texturas/arte raster de producción para transmitir metal, suciedad, iluminación y profundidad.
- Phaser Graphics queda reservado para marcos, barras, resaltados, hit areas, halos, flechas, partículas y feedback dinámico.

## Separación correcta

- **WebP:** coche, materiales, piezas, mesa/fondo, props principales.
- **Phaser/UI:** texto, cantidades, estadísticas, botones, marcos, barras, estados hover/drag, animaciones y efectos.

## Corrección inmediata aplicada

El Workshop V3 sustituye el coche procedural por el WebP oficial del coche seleccionado, reutilizando la misma convención de `GarageScene`.

Commits:
- `86e337d` — `UpgradeWorkshopArcadeV3Scene.js`, carga del coche WebP real.
- `70cf499` — activación de V3.

## Próximo pase obligatorio

Sustituir todas las ilustraciones procedurales restantes de materiales y piezas por un pack WebP coherente antes de cerrar el Workshop como pantalla comercial.
