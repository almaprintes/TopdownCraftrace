# DEV 1.3.20 — Dirección invisible en media pantalla

## Petición real
El propietario propone un método adicional parecido a las emisoras RC, pero con **toda la mitad izquierda de la pantalla como superficie táctil invisible**. Desplazar el dedo a izquierda/derecha debe girar el coche, mientras que en la derecha deben mantenerse **los pedales de gas/freno y el freno de mano habituales**. No sustituir los controles anteriores.

## Diseño del gesto
- Nueva preferencia de conducción `steeringMode='invisible'` (Ajustes → Controles → «◌ INVISIBLE»).
- La mitad izquierda en el perfil diestro es un área transparente con `touch-action:none` que ocupa `50vw` de ancho, toda la altura, sin palanca, barra, texto ni decoración visible en carrera.
- El primer punto donde se apoya el dedo fija el **centro flotante**. Al apoyar, dirección = 0; al mover a derecha/izquierda, el valor de giro se obtiene de `x - origenX` con recorrido nominal 92px, zona neutra 7.5%, sensibilidad e inversión guardadas y curva suave 1.15. **No acumula dirección entre movimientos ni entre gestos**, a diferencia del control `wheel` anterior.
- Mantener el dedo quieto conserva el giro; volver al punto de origen lo endereza; levantarlo (pointerup/cancel/lostcapture, blur o cierre de app) devuelve inmediatamente neutro.
- Una sola captura de pointerId en la mitad de dirección, independiente del otro dedo que acciona pedales. Los pedales tradicionales siguen utilizando `RaceHandbrakeScene._buildPedalRow()`, con sus hitboxes grandes y freno de mano intacto.
- En el perfil `leftHanded:true`, como en otros métodos, se espeja el reparto: área invisible a la derecha, pedales a la izquierda. No es el comportamiento predeterminado.
- La zona tiene z-index 79; los pedales/hitboxes conservan su capa, las opciones arriba a la derecha no quedan tapadas. Sin escanear carretera o curvas, sin nuevo bucle por fotograma, sin RAF ni timer para dirigir. La conversión del movimiento ocurre exclusivamente en eventos `pointermove`.
- Se alimenta la física actual por la misma vía que el mando táctil `wheel`: activa izquierda/derecha y escala el turnRate por la magnitud pedida, **sin cambiar parámetros ni modelos físicos de los coches**.
- El stick circular tradicional se oculta durante el modo Invisible, pero **gas, freno y freno de mano mantienen su interfaz original**. RC dos palancas, palanca normal, botones, dirección táctil, gamepad permanecen disponibles.
- El editor de controles muestra únicamente los pedales existentes y el freno de mano, porque la superficie invisible no tiene que colocarse ni escalarse. Preferencias de layout se guardan bajo clave propia `invisible:right/left`.

## Cambios y validación
- Nuevos `src/game/controls/invisibleSteeringGesture.js`, `src/game/scenes/RaceInvisibleSteeringScene.js` insertada entre RC y Handbrake.
- `RaceHandbrakeScene.js` importa nueva capa sin desmontar pedales existentes.
- `src/main.js` esconde el stick circular en este modo, no los pedales.
- `SettingsWheelModeScene.js` ofrece el selector y explicación ES/EN.
- `controlLayout.js` conoce el modo y su clave independiente.
- Smoke `scripts/invisible-steering-controls-smoke.mjs` añadido a `.github/workflows/pages.yml`: origen neutro, izquierda/derecha, sostener el giro, regresar al origen, soltar, inversión, sensibilidad, tamaño 50vw, pedal original derecho, modo zurdo y compatibilidad.
- Objetivo **DEV 1.3.20**, main, PWA. No APK/AAB, Google Play ni cambios de Supabase.
- Validación imprescindible: GitHub Actions + SHA vivo de Pages. Después conducción humana en iPhone con dos dedos, salidas de curva, zona neutra, freno y freno de mano. El control es experimental hasta prueba real; no prometer que será más cómodo.
