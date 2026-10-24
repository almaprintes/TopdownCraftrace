# DEV 1.3.21 — Ensayo de conducción A/B: inercia lateral al soltar

## Problema / hipótesis
El propietario encuentra cómodos el mando y la palanca táctil tradicional, pero no consigue una sensación natural consistente con diversas interfaces táctiles. Al salir de curvas puede aparecer una deriva que obliga a contravolante y eses. El contraste con otro juego de carreras sugiere investigar el modelo físico antes de seguir retocando botones.

Auditoría: `RaceScene.js` solo aplica `S.lateralGrip` en su bloque FRONT-STEER FEEL si existe orden de dirección. No obstante, **el proyecto ya contiene** otra estabilización neutra en `RaceWeightTransferScene.js`, de tasa `alignRate=1.8+2.6*alignLoad`. Por tanto la prueba B ajusta ese bloque existente en lugar de introducir otro solver. También existe `RaceCoastInertiaScene.js`, que gestiona la resistencia longitudinal y permanece intocado.

## A/B planteado
- **A · ACTUAL** (predeterminado): exacta estabilización ya publicada, sin modificación de giro, tracción o drag. Tiempos y progreso oficiales intactos.
- **B · SALIDA ESTABLE**: solo en pista asfáltica, con dirección prácticamente neutra (`abs(steer)<0.055`), velocidad >5 km/h, sin freno de mano, sin pista abierta/rally; usa la misma operación `vL*=exp(-alignRate*dt)` pero con `alignRate*1.45`. Atenúa algo más deprisa velocidad LATERAL respecto al morro; deja la velocidad longitudinal sin alterar, nunca cambia `rotation`, `turnRate` o `position`, y no sigue la centerline. Permite salir de curvas con menos arrastre lateral mientras el coche está apuntado a la recta.
- Sin nueva consulta de geometría, ciclo `RAF`, timer ni estructura de datos por frame; solo comparación de flag y multiplicación donde el cálculo ya existía. No se modifica el perfil de dirección de ningún coche ni el comportamiento en curva con giro activo.
- `SettingsWheelModeScene.js`: tarjeta adicional `PRUEBA DE CONDUCCIÓN A/B`, botones A y B independientes del método elegido (stick, gamepad, etc.). Cambia el siguiente inicio de carrera para evitar mezclar dos modelos en una misma vuelta.
- `RaceScene.init`: lee ajuste una sola vez. Ignora B en modos competitivos ghost/survival/duel/online. En B aísla historial `tdr2:ttHist:ab-practice-b:<circuito>:<coche>` y personal best `tdr2:ttBest:ab-practice-b:<circuito>:<coche>`; no escribe en las claves oficiales. Se omite recompensa base de vuelta.
- `RaceHandbrakeScene.create`: muestra una etiqueta fija, poco costosa, `FÍSICA B · PRUEBA · SIN RÉCORDS` cuando está activada B; A no añade HUD nuevo.
- `RaceGhostModeScene`: B no genera un fantasma oficial; `RaceCleanLapScene`: B no avanza misiones ni combos de vueltas limpias; `RaceSessionRewardsScene`: B omite pantalla de botín y el anuncio recompensado al finalizar.
- Se conservan versiones, físicas y progreso de Play Store/Android, no hay APK ni AAB.

## Validación técnica
CI `scripts/physics-ab-neutral-grip-smoke.mjs` valida fuente A/B, límites de superficie/gesto, separación de llaves de cronometraje y protecciones de fantasmas/misiones; verifica numéricamente que B atenúa más rápido la velocidad lateral pero no altera la longitudinal. Requiere Pages build verde y verificación del SHA en URL pública.

## Validación en iPhone
1. Seleccionar un mismo coche (p. ej., Spark) y circuito (Karting Tenerife), modo Palanca, misma dificultad/preset.
2. Ajustes > Controles > `A · ACTUAL`; correr varias vueltas y fijarse en dirección, inercia al soltar y cantidad de correcciones, además de tiempo de vuelta.
3. Volver a Ajustes > `B · SALIDA ESTABLE`; correr las mismas curvas con mismo coche/circuito; buscar la etiqueta B.
4. Comparar estabilización, contravolantes, naturalidad y si sigue conservando diferencias de conducción. Para volver a competición, elegir A.
5. No considerar mejor B solo por un tiempo menor. **La experiencia de conducción real** manda; ajuste 1.45 es inicial y reversible.
