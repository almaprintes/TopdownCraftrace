# Environment Studio — DOM shell migration

Fecha: 2026-09-01
Rama: `develop`
Versión: DEV 0.0.2

## Problema observado

Environment Studio había acumulado múltiples capas de UI Phaser a través de una cadena larga de clases heredadas que llamaban repetidamente a `_setupUi()` y añadían barras, títulos, botones, catálogos y controles nuevos sin retirar físicamente los anteriores. En pantalla terminaban superpuestos textos y controles de varias generaciones de la herramienta.

No era un problema de tamaños de fuente: coexistían varias interfaces activas.

## Solución

La clase final cargada por el juego, `EnvironmentBuilderAssetPointerUpScene.js`, actúa ahora como cortafuegos de presentación:

- Phaser queda reservado al lienzo editable: circuito, assets, superficies, barreras, selección y geometría.
- Los objetos Phaser identificados como UI porque están ignorados por la cámara de edición se ocultan y se desactiva también su interacción.
- Se monta una única carcasa DOM para los textos y controles de Environment Studio.
- La carcasa DOM incluye cabecera, guardar/cargar/exportar, selector de circuito, salida, zoom/pan/selección, catálogo de assets, editables, capas, herramientas de selección y controles de asfalto.
- Se conserva la lógica previa de recuperación de proyectos: borrador local > `.environment.json` del repositorio > proyecto vacío.

## Regla de arquitectura

No añadir nuevos textos o controles Phaser a Environment Studio. Toda nueva UI del Studio debe incorporarse a la carcasa DOM. Phaser solo debe representar y manipular el mundo editable.

## Validación necesaria

Comprobar en DEV:

1. No queda ningún texto/botón legacy superpuesto.
2. El circuito sigue visible y editable.
3. Los assets publicados en el repo se recuperan correctamente.
4. Añadir, seleccionar, mover, rotar, escalar, duplicar y borrar assets funciona.
5. Editables (asfalto, guardarraíl, barrera plástica, hormigón, valla y neumáticos) continúan funcionando.
6. Guardar, cargar y exportar mantienen el proyecto.
7. Cambio de circuito conserva el aviso de cambios no guardados.

Commit principal: `d5299f696a815e8de8248aac6c8e768930fb1ff2`.
