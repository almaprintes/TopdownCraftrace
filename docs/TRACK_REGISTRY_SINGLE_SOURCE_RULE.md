# Circuitos: registro único y prevención de catálogos duplicados

Fecha: 2026-08-08

## Incidente

Se añadieron nuevos `track.json` correctamente al repositorio y al `trackRegistry`, pero no aparecían en la pantalla CIRCUITOS.

La causa fue una segunda fuente de verdad en `src/game/scenes/TrackGarageFixedScene.js`: la escena construía manualmente `this._tracks` con solo `track01` y `forest-endurance`. Por tanto, cualquier circuito nuevo existente en la biblioteca quedaba invisible en el selector aunque estuviera correctamente registrado.

El problema quedó corregido en el commit `6592ad8`, haciendo que la pantalla use el catálogo procedente de `trackRegistry` en lugar de mantener una lista manual paralela.

## Regla obligatoria

**`trackRegistry` es la única fuente de verdad para la colección de circuitos.**

Nunca volver a crear arrays hardcodeados de circuitos en escenas, menús, previews, carrera, editor o cualquier otra capa.

Al añadir un circuito nuevo:

1. Crear/añadir su definición válida en la biblioteca de tracks.
2. Registrarlo en `trackRegistry` si la arquitectura vigente lo requiere.
3. El selector debe descubrirlo desde el registro común.
4. La carrera debe resolver la misma `trackKey` desde el mismo registro.
5. Preview, selección, récords y editor deben trabajar con esa misma key.

## Prueba mínima obligatoria al añadir un circuito

- Aparece en CIRCUITOS sin modificar manualmente `TrackGarageScene` ni wrappers derivados.
- Su preview corresponde a su geometría real.
- Al seleccionarlo, `tdr2:trackKey` conserva su key.
- Al entrar en carrera se carga ese circuito y no existe fallback silencioso a `track01`.
- Volver al selector conserva la selección.
- Los pianos visibles se consideran superficie conducible TRACK; fuera del piano vuelve a aplicar GRASS.

## Deuda técnica detectada

La arquitectura actual contiene escenas base y wrappers/parches sucesivos (`TrackGarageScene`, `TrackGarageFixedScene`, escenas derivadas de carrera, etc.). Esto ha permitido iterar rápido sin romper una versión jugable, pero aumenta el riesgo de:

- lógica duplicada;
- listas y configuraciones divergentes;
- parches que ocultan el comportamiento de la clase original;
- dificultad para saber qué archivo se ejecuta realmente;
- regresiones al añadir funciones nuevas.

## Refactor futuro recomendado

Cuando el juego esté en un punto estable, hacer una fase específica de simplificación, sin mezclarla con cambios visuales o de física:

1. Inventariar qué escenas se cargan realmente desde `game.js`.
2. Consolidar cada cadena de wrappers en una única implementación limpia.
3. Eliminar escenas/parches obsoletos solo después de comprobar equivalencia funcional.
4. Centralizar tracks, superficies, configuración de cámara y parámetros compartidos.
5. Añadir una comprobación de arranque que avise de track keys desconocidas en vez de hacer fallback silencioso.
6. Mantener pruebas de regresión para pista, pianos, selector, PWA, cámara y rendimiento.

Principio: **primero estabilizar; después simplificar con pruebas. No reescribir por estética mientras el juego está evolucionando rápidamente.**
