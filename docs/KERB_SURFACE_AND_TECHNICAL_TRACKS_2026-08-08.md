# Pianos conducibles y circuitos técnicos — 2026-08-08

## Regla de superficie para pianos

Problema detectado: los pianos rojo/blanco se dibujan parcialmente fuera del ribbon físico principal del asfalto. El detector antiguo clasificaba esa zona como `GRASS`, por lo que al pisar un piano se aplicaban reducción de aceleración, giro, velocidad máxima y drag de césped.

Solución activa: `src/game/scenes/RaceKerbSurfaceScene.js` añade una capa de detección específica para las franjas de piano. Solo la geometría correspondiente al piano visible se considera `TRACK`; no se ensancha artificialmente toda la pista. Al rebasar el piano y entrar realmente en césped, vuelve a aplicarse la penalización normal.

Regla obligatoria para futuros circuitos: **todo piano visible debe ser superficie conducible**. El piano forma parte utilizable del circuito, mientras que el terreno inmediatamente posterior conserva su comportamiento de hierba/off-road.

La carrera actual activa esta lógica a través de `RaceWideCameraPreviewScene.js`, que hereda de `RaceKerbSurfaceScene.js`.

## Sistema actual de circuitos

Los circuitos de biblioteca viven en `src/game/tracks/library/<slug>/track.json`. `trackRegistry.js` los descubre automáticamente con `import.meta.glob`, por lo que un nuevo directorio con `track.json` válido aparece en el selector sin tener que mantener una lista manual.

Cada circuito nuevo hereda el sistema visual y funcional común: ribbon de asfalto, líneas de borde robustas, pianos adaptativos, pianos conducibles, vegetación, minimapa, HUD, cámara y cronometraje.

## Circuitos técnicos añadidos

### TECHNICAL RIDGE — `technical-ridge`
- Dificultad: Alta.
- Longitud: Media-Larga.
- Anchura base: 152 px.
- Personalidad: sucesión de cambios de apoyo, curvas enlazadas, zonas de frenada y radios variables.
- Trazado validado geométricamente para no autointersectarse.

### SWITCHBACK PARK — `switchback-park`
- Dificultad: Alta.
- Longitud: Larga.
- Anchura base: 148 px.
- Personalidad: el más cerrado del grupo, con horquillas, cambios de dirección seguidos y ritmo stop-and-go.
- Está pensado para exigir precisión con gas, freno y entrada en curva.
- Trazado validado geométricamente para no autointersectarse.

### CHICANE VALE — `chicane-vale`
- Dificultad: Alta.
- Longitud: Media-Larga.
- Anchura base: 154 px.
- Personalidad: técnico pero más fluido; combina enlazadas, chicanes, zonas de apoyo continuo y cambios de radio.
- Trazado validado geométricamente para no autointersectarse.

## QA mínimo para cualquier circuito nuevo

1. Preview del selector sin cruces ni geometría retorcida.
2. Seleccionar el circuito y comprobar que la carrera carga realmente ese `trackKey`.
3. Revisar el minimapa completo.
4. Completar varias vueltas verificando meta/checkpoints y cronometraje.
5. Comprobar todos los pianos: deben mantener superficie `TRACK` mientras el coche esté sobre ellos.
6. Salir más allá del piano: debe cambiar a `GRASS` y penalizar.
7. Revisar que arcenes y pianos no creen islas, aberturas ni inversiones en curvas pronunciadas.
8. Sesión prolongada para comprobar rendimiento y temperatura, especialmente al aumentar vegetación/decoración.

## Principio de diseño

No buscamos circuitos hechos con nodos arbitrarios ni trazados que se crucen porque resulten visualmente complejos. La dificultad debe venir de la secuencia de curvas, radios, frenadas y cambios de apoyo. El trazado debe seguir siendo legible, continuo y físicamente coherente.