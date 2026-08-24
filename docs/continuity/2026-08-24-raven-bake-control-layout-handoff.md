# Handoff — 2026-08-24 — Raven Hollow, Beauty Bake global y calibración de controles

Repositorio: `almaprintes/TopdownCraftrace`  
Rama habitual: `main`

## Reglas críticas vigentes

- Comprobar siempre el estado real de `main` antes de editar.
- Usar el conector GitHub real y verificar el SHA exacto tras cada escritura.
- BASE 1.0 de física común sigue congelada salvo defecto concreto.
- El usuario prueba en iPhone real: no afirmar funcionamiento en dispositivo hasta confirmación.
- Mantener el modo seguro iOS ligero.
- No reintroducir luces delanteras blancas descartadas.
- `docs/continuity/GITHUB_ACCESS_RULE.md` sigue siendo vinculante.

## 1. Cámara dinámica y overlays

Se aumentó el acercamiento a baja velocidad sin tocar el extremo rápido del zoom:

- `02aa5f484b41edaee2b30227f93e93e29e749c14` — `Increase stopped-car gameplay zoom`.

Override final relevante en `RaceVisualRearPivotScene.js`: `_zoomGameplayMax = 1.38`.
Vigilar moaré al variar zoom si se aumenta más.

También se redujo opacidad de banners y se anuló el HUD TT antiguo que reaparecía detrás del minimapa:

- `c8a2101d225d8c72c407f8831c88111fbf494a04` — `Reduce race overlays and remove legacy lap panel`.

## 2. Raven Hollow — rendimiento

Circuito:

- `src/game/tracks/library/offroad-raven-hollow/track.json`

El usuario detectó tirones graves en iPhone. El overlay llegó a mostrar aproximadamente:

- FPS ~25
- `UP` ~59 ms
- `UP MAX` ~84 ms
- `FRAME MAX` ~39 ms
- `HOT hudInfo` ~3 ms
- `OBJ` ~104
- `CHUNK` ~25/52

Esto era saturación real de frame-time.

Se hicieron intentos transitorios de reducir chunks/culling, pero se recordó la arquitectura correcta: **las superficies visuales finales deben hornearse offline; el culling de texturas repetidas no debe ser la solución permanente**.

Raven recibió una textura específica:

- `public/assets/materials/dirt-road/road_damaged_2_diff_2k.jpg`

Commit de conexión inicial:

- `4abde0a38a63b59c674c4ab1619b301ae49985bc` — `Use dedicated Raven Hollow dirt texture`.

## 3. Beauty Bake debe ser global

Decisión de arquitectura: el baker debe aplicarse a **todos los circuitos**, no solo a Karting Tenerife.

Objetivo permanente:

1. detectar todos los `track.json` de `src/game/tracks/library/`;
2. hornear cada circuito offline;
3. generar preview + 4 tiles WebP + manifest;
4. publicar un catálogo generado de Beauty Layers;
5. en runtime, si la Beauty Layer existe, usarla y retirar el renderer visual viejo por chunks.

Workflow nuevo:

- `.github/workflows/bake-all-tracks.yml`

Commit de disparo/diagnóstico:

- `058acf2a6aefad3c9af1428a651cb0495c276513` — `Trigger diagnostic all-track beauty bake`.

El workflow observado era `Bake all tracks beauty`, run id `32785239236`.
Último estado comprobado durante esta sesión: seguía `in_progress` en `Bake every track` y todavía no había publicado el catálogo/assets. **No dar por terminado el bake hasta ver el commit automático o un fallo real en Actions.**

## 4. Raven Hollow — lógica exacta de marcas

Archivo:

- `src/game/scenes/RaceTransientTireMarksScene.js`

Reglas específicas fijadas por el usuario para Raven Hollow:

- pista principal de tierra: huella marrón oscura, gruesa y casi continua;
- asfalto exterior: huella de goma oscura, fina y de vida corta;
- asfalto → tierra: NO arrastra marca;
- tierra → asfalto: SÍ arrastra tierra marrón clara durante un tramo corto.

La lógica direccional quedó implementada antes de esta documentación y se refinó visualmente después.

Último ajuste confirmado en código:

- `1f96d96a7641e9275f0db372f2eb1972713bb50f` — `Darken Raven Hollow dirt track marks`.

Valores actuales sobre tierra de pista Raven:

- color `0x2f1d12`;
- alpha base `0.52` + velocidad;
- grosor base `6.4` + slip;
- vida `1650 ms`;
- `RAVEN_MIN_SPEED = 45` para que marque casi continuamente.

No modificar las otras tres reglas de superficie salvo petición expresa.

## 5. Configuración 2.0 — calibración personalizada de controles

El usuario pidió una función tipo juego móvil premium para recolocar los controles táctiles milimétricamente desde Configuración.

La implementación inicial está ya en `main`.

Nueva infraestructura:

- `src/game/controls/controlLayout.js`

Commit:

- `7665a7b546ed219048e2ee73bca381d69d3ae5e4` — `Add customizable touch control layout helpers`.

Características:

- posiciones normalizadas `x/y`;
- escala por control;
- guardado dentro de `tdr2:settings`;
- layout independiente por método (`stick`, `buttons`, `wheel`) y por mano (`left/right`);
- defaults reflejados para modo zurdo;
- rango de escala sanitizado 65%–155%.

Pantalla de calibración dentro de `SettingsDomScene.js`:

- `8e5f74b4a31dff277a8ae56f9d4074f2a71c4f05` — `Add touch control calibration screen`.

Incluye:

- simulación visual de carrera;
- arrastrar controles;
- seleccionar control;
- cambiar tamaño con `+ / −`;
- zonas protegidas del HUD;
- estado inválido si invade HUD o sale de pantalla;
- Restablecer;
- Probar/Editar;
- Guardar/Cancelar.

Actualmente `PROBAR` es una prueba de alcance visual/táctil, no una microcarrera física real. La microcarrera conducible queda como posible fase 2.

Aplicación en carrera:

- `5a07bbf08b5ac6cea88f01739f647c57d4735381` — `Apply saved custom touch control layouts in race`.

Los layouts guardados se aplican a palanca/volante, GAS, FRENO y freno de mano.

Botones de dirección Phaser:

- `deb8e7b1055aa51fc105c95142925dcb9cfe6d40` — `Use custom positions for steering buttons`.

Modo zurdo:

- `977f3c819d2db2b08beb7321f72688af5cc526bf` — `Honor custom layout in left handed controls`.

## 6. Configuración — posición visible del acceso al calibrador

El usuario no encontró inicialmente el botón porque estaba debajo de Sensibilidad y fuera de la primera vista.

Se decidió que una feature tan importante debe estar visible inmediatamente.

Ahora el orden es:

1. MODO DE DIRECCIÓN
2. DISPOSICIÓN EN PANTALLA / PERSONALIZAR CONTROLES
3. MODO ZURDO + INVERTIR DIRECCIÓN
4. SENSIBILIDAD

Commit:

- `5f1f9f934c0ea1df323a4b7d165d5bc95bbef1a2` — `Surface control customization in settings`.

## 7. Estado de prueba pendiente

La calibración de controles está implementada en código pero todavía necesita validación real en iPhone.

Prueba mínima recomendada:

1. Configuración → Controles → Palanca → Personalizar controles.
2. Mover GAS claramente hacia el centro y aumentar su tamaño.
3. Guardar.
4. Entrar en carrera.
5. Confirmar que posición, tamaño y hit-area coinciden.
6. Repetir con Volante y Botones.
7. Probar modo zurdo por separado.

No dar por cerrada la feature hasta esa validación.

## 8. Próximos pasos recomendados

1. Comprobar el estado real del workflow `Bake all tracks beauty`; si está bloqueado, leer logs y corregir la causa.
2. Confirmar que Raven Hollow queda realmente en Beauty Layer horneada y comparar sus ms antes/después.
3. Validar en iPhone la nueva marca oscura de tierra Raven.
4. Validar la calibración de controles y corregir primero hitboxes/posiciones si difieren de lo visual.
5. Fase 2 opcional del calibrador: `PROBAR` como microcarrera realmente conducible sin salir del editor.

## 9. Correcciones posteriores del calibrador y controles iOS

Tras la primera prueba real en iPhone aparecieron varios defectos que deben considerarse parte del mismo bloque funcional.

### 9.1. Guardado/calibrador y selector de modos

La primera versión del calibrador era visualmente pobre y el flujo de guardado podía dejar la app bloqueada al volver al selector de modo de juego.

Se endureció el flujo DOM y el modal posterior:

- `b60d178c12583e92957d5837662a4c72c949ffd9` — `Rebuild control calibrator and harden save flow`.
- `c3fe3bf590cf486c4e0a66af0f006b0f71943ce3` — `Harden game mode modal input after DOM settings`.

Regla de continuidad: cualquier pantalla DOM que se cierre durante un gesto táctil debe evitar dejar un `pointerup` heredado o una captura activa que interfiera con Phaser.

### 9.2. RESTABLECER debe volver al layout real de fábrica

Se detectó que `RESTABLECER` no restauraba el layout original: GAS, FRENO y freno de mano quedaban demasiado juntos porque los defaults eran coordenadas normalizadas aproximadas.

Se sustituyeron esos defaults por cálculo desde la geometría real usada por `RaceHandbrakeScene.js`:

- ancho real del freno de mano;
- ancho/alto real de pedales;
- separación real entre freno de mano, FRENO y GAS;
- margen inferior y margen al borde;
- cálculo según viewport actual.

Commit verificado:

- `7f54068fbf616ee56f3eebb5aaf8d15222325dbf` — `Fix factory control reset and harden iOS touch controls`.

Desde este commit, `defaultControlLayout()` debe representar la disposición real de fábrica, no una aproximación visual.

### 9.3. Blindaje táctil específico de iOS

En carrera se detectaron dos fallos graves:

- doble toque rápido sobre GAS podía activar el zoom de iOS;
- una pulsación/gesto podía seleccionar el texto `GAS`, secuestrar la interacción y dejar el juego sin responder.

El mismo commit `7f54068fbf616ee56f3eebb5aaf8d15222325dbf` añadió blindaje sobre los controles DOM:

- `touch-action: none`;
- `user-select: none`;
- `-webkit-user-select: none`;
- `-webkit-touch-callout: none`;
- `-webkit-tap-highlight-color: transparent`;
- `draggable = false`;
- bloqueo de `dblclick`, `contextmenu`, `selectstart`, `dragstart`, `gesturestart`, `gesturechange` y `gestureend` en el root de controles.

Este blindaje se aplica a palanca/pedales y también intenta cubrir freno de mano y volante cuando existen.

Prueba iPhone pendiente: pulsar GAS repetidamente muy rápido, mantener el dedo sobre las palabras GAS/FRENO, deslizar entre pedales y hacer pulsación larga. iOS no debe mostrar zoom, selección, callout ni bloquear la app.

### 9.4. Botones + modo zurdo: no invertir semántica izquierda/derecha

Se detectó que al usar método `BOTONES` y activar `MODO ZURDO`, el `mirror()` reflejaba cada botón individualmente y terminaba cruzando el orden visual de los controles.

Regla correcta:

- modo zurdo cambia el **bloque de dirección** al lado opuesto;
- `◀ IZQUIERDA` debe seguir visualmente a la izquierda de `▶ DERECHA`;
- no confundir modo zurdo con `INVERTIR DIRECCIÓN`.

Corrección verificada:

- `41616859b33db8a8bff3574da01b8b0024b44664` — `Preserve button order in left handed mode`.

Implementación: al reflejar un layout que contiene `left` y `right`, se intercambian sus coordenadas reflejadas para conservar el orden semántico del par.

## 10. Estado de validación actualizado

A fecha de esta documentación, el código está en `main`, pero siguen pendientes de confirmación real en iPhone:

1. que `RESTABLECER` reproduzca exactamente la disposición original de fábrica;
2. que double-tap/pulsación larga no activen zoom ni selección de texto;
3. que no vuelva a ocurrir un bloqueo de input al guardar/salir del calibrador;
4. que en `BOTONES + ZURDO` el bloque cambie de lado manteniendo `◀` a la izquierda de `▶`;
5. que los hitboxes continúen coincidiendo con la posición visual tras mover/escalar controles.

No marcar el sistema de calibración como cerrado hasta validar esos cinco puntos en dispositivo real.
