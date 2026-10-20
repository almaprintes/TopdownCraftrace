# TOP DOWN RACE — Sentidos de carrera — 20/10/2026

## Decisión aprobada
- Añadir sentido normal e inverso a cada circuito cerrado reutilizando la misma foto, asfalto, Bézier y colisiones. No duplicar imágenes ni alterar físicas o calidad iOS.
- Piloto inicial Karting Tenerife: el recorrido existente y sus récords siguen siendo antihorarios (karting-tenerife); el nuevo horario (karting-tenerife-horario) tiene meta/checkpoints invertidos, salida propia y récords/ghosts/rankings independientes. Mostrar una tarjeta y dos opciones internas.
- Cuando Tenerife esté validado físicamente, extender a los otros circuitos cerrados. Auditar metadatos, normas direccionales, progresión y metas auxiliares antes de habilitar.
- Fase futura de rally: el tramo actual Arafo → Los Loros permanece intacto (RALLY 1.0). La variante inversa se llamará Los Loros → Arafo, según corrección expresa del propietario (NO Los Silos → Arafo). Es A→B y requiere intercambiar inicio/final y validar físicamente. No implementarla todavía.

## Primera fase DEV 1.2.320
- trackReverseVariant.js: identidad independiente para Tenerife horario, inversión de meta y orden+normal de CPs, spawn aguas arriba.
- trackRegistry.js: variante calculada desde el circuito base sin tocar su fuente .tdrtrack.
- TrackGarageAndroidTouchScene.js: selector de sentidos dentro de la tarjeta Tenerife.
- MenuScene.js: usa la variante escogida al iniciar carrera; tarjeta base queda seleccionada.
- MenuTrackPresentationScene.js: muestra la dirección escogida en el lobby.
- trackUnlocks.js: ambas identidades disponibles para récords y estadísticas; el selector del jugador filtra duplicados.
- scripts/karting-tenerife-clockwise-smoke.mjs: test de geometría y claves con fuentes reales instaladas en CI.
- No generar APK/AAB sin petición; Google Play sin cambios.

## Validación en dispositivo pendiente
Tres vueltas limpias en cada sentido con salida/reinicio, pausa, CP1+CP2, meta y Race Control. Comprobar que histórico, ranking y fantasmas apuntan a su variante, que las fotos siguen intactas y que la original conserva todos sus tiempos. No extender a otras pistas hasta aprobar esto.

## Nomenclatura aprobada y ampliación DEV 1.2.322
- Norma visible: **Nombre del circuito** para su sentido NORMAL y **Nombre del circuito INVERSO** para su sentido contrario. No añadir «Horario» ni «Antihorario» al nombre, aunque la dirección geométrica determine icono/flecha.
- Karting Tenerife: el horario confirmado es **KARTING TENERIFE** (identificador técnico heredado `karting-tenerife-horario`) y el antihorario histórico es **KARTING TENERIFE INVERSO** (ID técnico `karting-tenerife`); no cambiar las claves para conservar rankings y fantasmas históricos.
- Karting Américas, Karting Canarias (variante 4096 cuando existe), Santa Cruz y Circuito Atlántico: conserva cada uno su recorrido publicado bajo su nombre original; el nuevo ID `*-inverso` invierte orden y normales de los CP y de meta, y tiene salida orientada y clasificaciones propias.
- Una sola tarjeta y una sola foto/colisiones por circuito; selector interno NORMAL / INVERSO. El lobby y el PLAY real deben usar la opción guardada por circuito.
- La vía adicional de la meta del paddock de Américas solo aplica al recorrido original, nunca al inverso.
- Mantener intacto RALLY 1.0. Futura fase: **Los Loros → Arafo**.
- CI exige `scripts/karting-tenerife-clockwise-smoke.mjs` y `scripts/all-circuit-directions-smoke.mjs`. Sin APK ni modificación de Play. Pendiente prueba física de todas las nuevas variantes y comprobación de vueltas limpias.
