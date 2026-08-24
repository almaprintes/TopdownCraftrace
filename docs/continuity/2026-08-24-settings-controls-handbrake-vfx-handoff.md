# Handoff — 2026-08-24 — Settings 2.0, controles, volante, freno de mano y VFX de huellas

Repositorio: `almaprintes/TopdownCraftrace`  
Rama: `main`

## Estado de referencia al cerrar esta sesión

Último cambio funcional realizado: `4bce9dc943ae428511adcfc3e2d68d3342ec36ff` — huellas fuera de pista más oscuras, gruesas y visibles, sin tocar el arrastre de tierra sobre asfalto.

La sesión se centró en modernizar Configuración, ampliar métodos de control, añadir freno de mano con física de drift, reorganizar los pedales y mejorar VFX/compatibilidad iPhone.

## 1. Configuración 2.0

La configuración antigua de Phaser era heredada de las primeras versiones y llegó a congelarse en iPhone. Se decidió no seguir parcheándola y reconstruirla como interfaz DOM/CSS ligera y moderna, conservando compatibilidad con `tdr2:settings`.

Commit de la primera Configuración 2.0 activa: `1d666569cf02d0b2221c5daf17bc26cf60cc9e69`.

Archivos/layers relevantes:
- `src/game/scenes/SettingsDomScene.js`
- `src/game/scenes/RaceLeftHandedControlsScene.js`

Criterios fijados:
- Cambios simples como modo zurdo, sensibilidad, audio y partículas deben aplicarse sin reiniciar escena.
- Solo cambios estructurales de vídeo pueden requerir aplicar/reiniciar.
- Mantener `tdr2:settings` como fuente de preferencias.

## 2. Modo zurdo

Se añadió una opción en Configuración para intercambiar los lados de los controles. La lógica real de carrera también refleja dirección/pedales, no solo el arte.

Archivo relevante:
- `src/game/scenes/RaceLeftHandedControlsScene.js`

## 3. Cuarto método de control: VOLANTE

Se añadió `VOLANTE` junto a Palanca, Botones y Mando.

Secuencia importante:
- `7b00d10195a574a92db3782c6195d7e5964cf85a`: primera incorporación.
- `e836cbd4ac3500362fe2ac37baf8e86d670e9139`: se intentó comportamiento tipo joystick centrado.
- `f6a7f2b436363bc9e9e031b1a64d95c3aa97d2e6`: separación de `targetAngle`; el volante debía mantener giro continuo.
- `7c89a74fbfd4c44d3eb76fc06d0076d2cc26badd`: nueva ruta de dirección mantenida.
- `15c2a896a7672710d91256590ea429672c56a6c8`: asset final de volante conectado.

Asset actual:
- `public/assets/ui/tdr_steering_wheel_nissan.webp`

Archivo lógico principal:
- `src/game/scenes/RaceWheelModeScene.js`

### Comportamiento deseado del volante

El usuario dejó muy claro que debe sentirse como un volante real:
- si se mantiene girado a la derecha, el coche debe seguir curvando indefinidamente y poder completar 360°, 720°, etc.;
- no debe tratarse como orientación absoluta del coche;
- al soltar, vuelve al centro;
- el giro visual debe ser contenido y preciso.

El movimiento estaba “casi conseguido” pero seguía requiriendo afinación fina al pasar a otros trabajos. No dar por cerrada la física/sensación del volante sin prueba del usuario.

## 4. Freno de mano para drift

Se añadió un freno de mano visual y físico.

Archivo principal:
- `src/game/scenes/RaceHandbrakeScene.js`

Assets actuales:
- `public/assets/ui/tdr_handbrake_idle.webp`
- `public/assets/ui/tdr_handbrake_pulled.webp`

Los dos assets fueron preparados por el usuario con exactamente el mismo lienzo/base para que, al pulsar, la base no se mueva y solo cambie la posición de la palanca. Deben tratarse como dos frames del mismo objeto, misma caja, misma posición, sin transformaciones independientes.

Commits clave:
- `ca3ca9a0586e30db789bc2561a05e62a76358cb7`: implantación inicial.
- `99f5ceb71423f07db342280b5708da44586ba48a`: movimiento del freno de mano junto a pedales.
- `19a7184f413b2031b6555ba2beefde3a803f9aaa`: misma caja 859×1024 y cambio por opacidad para mantener base clavada.
- `24326495c0c020e131e756220fbdc96b03c223d2`: más deslizamiento de la trasera.
- `af89ae953dfc7f30cb7df73af7d3a8193ed01cdb`: palanca un poco mayor.

### Física actual del freno de mano

Objetivo aprobado:
- bloquear/perder agarre trasero de forma clara;
- conservar suficiente inercia para driftear;
- crear más velocidad lateral y guiñada con dirección;
- no convertirse automáticamente en trompo;
- la trasera debe deslizar notablemente más que con el freno normal.

El usuario pidió explícitamente “que deslice más la trasera”; el ajuste está implementado, pero sigue siendo una zona susceptible de afinación por sensaciones.

## 5. Nueva distribución GAS / FRENO / FRENO DE MANO

Se abandonó la disposición apilada vertical de GAS/FRENO. Ahora se busca un bloque horizontal de controles al borde de la pantalla.

Disposición normal, de dentro hacia fuera:

`GAS → FRENO → FRENO DE MANO → borde derecho`

En modo zurdo se refleja.

Commits:
- `c8fad4224acab62933e8d2acc73cb0cca7f2fc09`: pedales verticales paralelos y freno de mano al borde.
- `faaddfc96ed0f454d751c6aa3c6e1c4edbe54008`: pedales algo más estrechos, más pegados al borde, texto vertical y gesto continuo.

### Gesto continuo del pulgar

Requisito funcional importante:
- pulsar GAS y, sin levantar el dedo, deslizar a FRENO debe soltar gas y activar freno;
- seguir deslizando hacia el freno de mano debe soltar freno y activar freno de mano;
- debe poder recorrerse también en sentido contrario con el mismo dedo;
- los pequeños huecos visuales no deben cortar el gesto.

Esta lógica está dentro de `RaceHandbrakeScene.js` mediante zonas/hit-test DOM y cambio de modo continuo.

### Texto vertical de pedales

El texto de GAS/FRENO se reorganizó verticalmente para aprovechar los pedales estrechos. El usuario pidió palabras apiladas en columna vertical.

## 6. iPhone: evitar selección de texto

Se detectó que Safari/iPhone permitía seleccionar:
- el símbolo de pausa;
- las palabras GAS/FRENO y sus textos.

Se bloqueó selección y menú contextual/long-press en esos controles.

Commit:
- `d2772379dcec8ea4a01c60866e1f8bded0becc27`

Archivo de pausa relevante:
- `src/game/scenes/RacePauseMenuScene.js`

Mantener `user-select:none`, `-webkit-user-select:none`, `-webkit-touch-callout:none` y `touch-action` apropiado en controles táctiles.

## 7. VFX ya presentes en dispositivos buenos

Durante la sesión se venían premiando los dispositivos capaces con VFX adicionales, mientras el modo seguro de iPhone antiguo reduce carga.

Ya existen:
- marcas temporales de neumáticos;
- arrastre de tierra al volver al asfalto;
- pilotos traseros rojos con iluminación al frenar;
- estela visual muy breve a alta velocidad.

Archivos relevantes:
- `src/game/scenes/RaceTransientTireMarksScene.js`
- `src/game/scenes/RaceBrakeLightsSpeedTrailScene.js`

Las luces blancas delanteras experimentales fueron descartadas: no deben reaparecer.

## 8. Huellas en tierra — último cambio

Petición final del usuario:
> Las marcas que deja el coche en tierra, solo en tierra, deben ser mucho más evidentes, marrón oscuro y gruesas. Las manchas que entran en el asfalto no se tocan porque están perfectas.

Implementado en:
- `src/game/scenes/RaceTransientTireMarksScene.js`

Commit:
- `4bce9dc943ae428511adcfc3e2d68d3342ec36ff`

Cambio aplicado SOLO al bloque `offRoad`:
- color marrón más oscuro;
- mayor alpha;
- mayor grosor;
- algo más de duración.

NO se modificó el bloque `carryingDirt`, que controla las manchas marrón claro que el coche arrastra al entrar de nuevo al asfalto. Esas manchas deben conservarse exactamente salvo petición expresa posterior.

## 9. Modo seguro / iPhone 12 — contexto importante

Antes de esta fase se trabajó mucho para que un iPhone 12 que congelaba Configuración y expulsaba al entrar en pista pudiera usar un modo seguro más ligero. Entre las medidas tomadas estaban reducir elementos costosos, evitar vídeo de entrada en ese modo y usar una cuenta atrás simple 3-2-1 en lugar del semáforo pesado cuando corresponda.

Regla: los VFX premium como marcas, luces/estelas no deben comprometer el modo seguro. El código ya usa `window.__tdrIosSafeMode` en varias capas.

## 10. Texturas de superficie y créditos — contexto de la misma sesión

También se integraron texturas 2K para hierba/offroad/asfalto y se documentaron sus autores/licencias. La hierba y offroad proceden del mismo autor mostrado por el usuario; el asfalto y la carretera de tierra proceden de otro autor mostrado por el usuario. Poly Haven/license se consultó como referencia en la sesión. No perder los créditos ya documentados en otros archivos de continuidad.

## 11. Estado exacto para continuar

Al abrir el siguiente chat:
1. Leer `docs/CHATS.md` como continuidad general.
2. Leer ESTE archivo completo.
3. Comprobar `main` real antes de tocar nada.
4. Verificar que `4bce9dc943ae428511adcfc3e2d68d3342ec36ff` está en la historia de `main` o identificar commits posteriores.
5. No tocar las manchas `carryingDirt` del asfalto.
6. No reintroducir luces blancas delanteras.
7. Mantener Configuración 2.0 DOM/CSS; no volver a la configuración Phaser antigua.
8. Mantener los dos frames del freno de mano en exactamente la misma caja/posición.
9. Antes de cambiar la física común del coche, recordar que BASE 1.0 sigue congelada salvo defecto concreto.

## Próximo punto de trabajo probable

El usuario acaba de pedir/validar VFX más evidentes en tierra. Lo natural es probar visualmente ese último commit en iPhone y ajustar únicamente color/grosor/duración de `offRoad` si lo pide. Después se puede seguir afinando ergonomía del bloque GAS/FRENO/FRENO DE MANO o la sensación del volante, según la prueba real.
