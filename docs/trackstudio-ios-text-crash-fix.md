# TrackStudio — corrección de pantalla negra al tocar (DEV 1.2.102)

## Síntoma
Captura real desde iPhone, al tocar TrackStudioScene:
`Frame.updateUVs → Frame.setSize → Text.updateText → Text.setText → TrackStudioScene`.
El overlay de recuperación de errores muestra pantalla negra con traza de JS.

## Causa acotada
La selección del borde de la fase B llamaba al inspector del editor, que actualizaba un `Phaser.GameObjects.Text` cada vez que se tocaba o arrastraba. En WebGL móvil, esa ruta puede fallar dentro del refresco de la textura interna (`Frame.updateUVs`).

## Corrección
- Mientras está activo **AJUSTAR BORDES**, el inspector no invoca el panel original de Phaser ni crea/actualiza ninguna textura de texto.
- Un texto HTML nativo presenta el lado del borde, nodo y coordenadas; se coloca en la columna derecha en coordenadas CSS derivadas del lienzo y se actualiza en resize/orientación.
- Fuera de modo forma, se mantiene el inspector original, para no alterar las herramientas tradicionales de TrackStudio.
- Se evita también `editBtn.setText()` al alternar el botón AJUSTAR, usando tinte visual sin cambiar el contenido del texto.
- El panel HTML se retira y desconecta listeners al abandonar la escena.
- No se modifica ni reexporta ninguna centerline, imagen, pista guardada o límite lógico.

## Prueba
`node scripts/trackstudio-text-crash-smoke.mjs`:
genera actualizaciones DOM, comprueba dimensiones relativas al canvas, cleanup y exige que el código del inspector de forma no invoque `.setText()`.
Se mantiene la suite de pruebas de fases A/B y la verificación Build+Deploy de main.

Limitación: la captura aporta la cadena de llamadas, no el mensaje exacto de excepción; la corrección elimina la ruta que falla al tocar bordes. Validar en iPhone para confirmar el comportamiento real.
