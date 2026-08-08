# Integración de rendimiento y crafting por coche — 2026-08-08

## Hallazgos del código

La física final del coche se obtiene en capas:

1. `CAR_SPECS` define el carácter base: `maxFwd`, `accel`, `brakeForce`, `linearDrag`, `turnRate`, `turnMin`, `gripCoast`, `gripDrive`, `gripBrake` y metadatos de diseño.
2. `handlingProfiles.js` añade personalidad de dirección/motor/neumáticos (`ARCADE`, `DIRECT`, `F1_DOWNFORCE`, etc.).
3. Los upgrades legacy se convierten en tuning numérico.
4. Garage Fusion añade tuning por piezas equipadas.
5. `resolveCarParams()` produce los parámetros físicos finales usados por RaceScene.

Referencias recuperadas del sistema legacy:

- Motor por nivel: `accelMult +8%` y `maxFwd +35 px/s`.
- Frenos por nivel: `brakeMult +10%`.
- Neumáticos por nivel: `gripDrive +0.02`, `gripCoast +0.01`, `gripBrake +0.015`.

La relación VEL de los coches oficiales con punta se aproxima de forma prácticamente exacta a:

`maxFwd = 397.5 + 2.55 × VEL`

La frenada oficial sigue aproximadamente:

`brakeForce = 896.84 + 3.0628 × FRN`

No asumir que todas las demás stats UI tienen una conversión lineal universal: hay personalidad por familia/perfil y algunos coches usan perfiles especiales.

## Cambio de arquitectura de Garage Fusion

Antes las piezas equipadas eran globales para todos los coches (`state.equipped`). Esto era incorrecto para un sistema de tuning por vehículo.

Desde el commit `bbf19fe`, Garage Fusion mantiene `equippedByCar`.

- Cada coche conserva su propio motor/frenos/ruedas/suspensión/caja.
- `getEquippedForCar(state, carId)` resuelve el loadout.
- `equip(state, partId, carId)` monta la pieza en ese coche.
- `garageTuning(state, carId)` calcula solo el tuning de ese coche.
- El antiguo `equipped` permanece como puente de migración para no perder partidas anteriores.

## Workshop de rendimiento

Desde `d05cd50` / `97659f2`, la escena activa del Workshop es `UpgradeWorkshopPerformanceScene.js`.

El panel derecho muestra el coche seleccionado y los valores físicos finales:

- PUNTA (`maxFwd`)
- ACEL. (`accel`)
- FRENO (`brakeForce`)
- GIRO (`turnRate`)
- GRIP (`gripDrive`)

La comparación se hace entre:

- base actual + upgrades legacy;
- base actual + upgrades legacy + piezas fabricadas equipadas.

Por tanto, el porcentaje verde enseña específicamente cuánto están aportando las piezas de Garage Fusion, no mezcla su efecto con mejoras antiguas.

## Regla de balance

No usar mejoras genéricas del tipo '+10% a todo'. Cada familia debe afectar variables coherentes:

- motor → aceleración y punta;
- frenos → fuerza de frenada y, con cautela, grip de frenada;
- ruedas → grips;
- suspensión → respuesta de giro/turnMin;
- transmisión → entrega/aceleración, con efecto menor que el motor.

Mantener la personalidad de las familias de coches. Una pieza mejora el coche existente; no debe convertir un VELOCE, AVENIR o FORGE en el mismo vehículo.

## Próximo paso recomendado

Completar una tabla de los 15 coches oficiales con sus stats UI y parámetros físicos, y después calibrar T1/T2/T3/T4 de cada familia de pieza respecto al rango real de la flota. El objetivo es que el Workshop pueda mostrar antes de equipar una previsión exacta del cambio físico y, cuando sea demostrable, su equivalente aproximado en stats UI.
