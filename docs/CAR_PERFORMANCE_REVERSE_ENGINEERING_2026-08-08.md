# TDR2 · Ingeniería inversa del rendimiento de los coches

Fecha: 2026-08-08

## Objetivo

Reconstruir desde el código la metodología con la que se definieron los coches para poder balancear correctamente el nuevo sistema de crafting y evitar modificadores arbitrarios.

## 1. Capas reales que forman el comportamiento de un coche

El comportamiento final no sale de un único número. La cadena actual es:

1. `CAR_SPECS[carId]` — personalidad/base individual del coche.
2. `HANDLING_PROFILES` — perfil de conducción general (`ARCADE`, `DIRECT`, `F1_DOWNFORCE`, `RALLY_LOOSE`, `DRIFT`, `HEAVY_TRUCK`).
3. upgrades legacy por coche — motor, frenos y neumáticos.
4. Garage Fusion — piezas equipadas por familia.
5. dev tuning — override de desarrollo.
6. `resolveCarParams()` — combina todo y produce los parámetros físicos finales usados en carrera.

Por tanto una pieza del crafting debe actuar como un modificador de la base, nunca sustituir la personalidad del coche.

## 2. Variables base de `carSpecs.js`

Unidades internas declaradas en el propio archivo:

- velocidades: px/s
- aceleraciones/frenadas: px/s²
- giro: rad/s
- agarres: coeficientes adimensionales

Variables principales:

### `maxFwd`
Velocidad máxima hacia delante. El código de los vehículos oficiales demuestra una relación prácticamente exacta con la estadística UI `VEL`:

`maxFwd = 397.5 + 2.55 × VEL`

Ejemplos comprobados:

- VEL 53 → 532.7 px/s
- VEL 62 → 555.6 px/s
- VEL 71 → 578.6 px/s
- VEL 91 → 629.6 px/s

El error es únicamente redondeo decimal.

### `maxRev`
Velocidad máxima marcha atrás. En los coches revisados permanece en 260 px/s y no forma parte de la diferenciación principal.

### `accel`
Aceleración longitudinal. Está relacionada con `ACC`, pero no parece responder a una única recta global para todas las familias. Los coches FORGE, por ejemplo, reciben una aceleración física significativamente mayor que la que correspondería a una extrapolación simple de los coches ligeros. Esto indica que la estadística de diseño se combinó con personalidad/categoría del vehículo y no debe reinterpretarse como un porcentaje universal.

Ejemplos:

- HÉLIX Spark — ACC 56 → 745.9 px/s²
- CROWN Equinox — ACC 71 → 785.7 px/s²
- VELOCE Surge — ACC 81 → 812.2 px/s²
- FORGE Hammer — ACC 82 → 863.8 px/s²

Conclusión: preservar la base individual y aplicar multiplicadores relativos al equipar motor/transmisión.

### `brakeForce`
Fuerza máxima de frenado. Hay una relación prácticamente exacta con `FRN`:

`brakeForce ≈ 896.84 + 3.0628 × FRN`

Ejemplos:

- FRN 58 → 1074.5
- FRN 63 → 1089.8
- FRN 71 → 1114.3
- FRN 73 → 1120.4

Esto confirma que FRN es la representación UI de una magnitud física real del modelo.

### `engineBrake`
Retención del motor al soltar acelerador. En los vehículos oficiales revisados aparece en 260, por lo que actualmente diferencia poco o nada entre coches.

### `linearDrag`
Resistencia longitudinal constante. Es una variable pequeña pero muy importante para el carácter del coche y su pérdida de velocidad.

Patrones visibles:

- VELOCE: 0.026–0.027, poca resistencia y prioridad a velocidad.
- all-rounders: ~0.031–0.032.
- FORGE: ~0.037, mayor resistencia asociada a vehículos pesados.

No debe ser alterada indiscriminadamente por piezas de motor; es más apropiada para aerodinámica/peso si se implementan esas familias en el futuro.

### `turnRate`
Velocidad angular base. Correlaciona fuertemente con `GIR`, pero interviene además la personalidad del vehículo.

Ejemplos:

- FORGE Hammer: GIR 33 → 2.89 rad/s
- VELOCE Photon: GIR 44 → 3.51
- HÉLIX Spark: GIR 67 → 3.80
- AVENIR Gripline: GIR 82 → 4.26
- AVENIR Torque: GIR 91 → 4.39

### `turnMin`
Umbral/limitación del giro. Cuanto menor es, más capacidad conserva el coche para rotar en condiciones donde otros quedan limitados.

Ejemplos:

- AVENIR Torque: 0.25
- HÉLIX/CROWN: ~0.27
- VELOCE: 0.28–0.30
- FORGE: ~0.33

Por tanto suspensión/dirección puede tocar `turnRate` y `turnMin`, pero en cantidades pequeñas.

## 3. Los tres agarres no significan lo mismo

### `gripCoast`
Agarre lateral al rodar sin acelerar/frenar. Está muy vinculado a estabilidad (`EST`).

Patrón de familias:

- VELOCE: ~0.22
- HÉLIX/CROWN: ~0.25–0.26
- AVENIR: ~0.26–0.27
- FORGE: ~0.30

### `gripDrive`
Agarre bajo aceleración. Un valor menor permite más deslizamiento bajo potencia.

- VELOCE: ~0.05
- HÉLIX/CROWN: ~0.08–0.10
- AVENIR: ~0.12
- FORGE Hammer: ~0.04

Es crucial no interpretar “más grip siempre es mejor”: modificarlo cambia el carácter del coche.

### `gripBrake`
Agarre lateral al frenar. Influye en estabilidad durante entrada de curva/frenada.

Rango observado aproximadamente 0.16–0.20.

## 4. Perfiles de handling

`handlingProfiles.js` añade una segunda capa de personalidad que no aparece directamente en las cinco barras UI.

### DIRECT
- dirección más inmediata
- `lateralGrip` alto
- menos dirección a alta velocidad
- respuesta de gas más directa

### F1_DOWNFORCE
- `gripSpeedGain: 0.12`
- simula aumento de agarre con velocidad
- frenada y dirección de alta velocidad específicas

### ARCADE
Perfil general equilibrado.

### RALLY_LOOSE / DRIFT
Reducen agarre lateral y permiten mayor deslizamiento.

### HEAVY_TRUCK
Respuesta más pesada y más drag.

Esto significa que dos coches con cifras UI parecidas pueden comportarse de forma claramente distinta.

## 5. Qué hace `resolveCarParams()`

`resolveCarParams(baseSpec, tuning)` conserva la base y aplica modificadores:

- `accel = base.accel × accelMult`
- `brakeForce = base.brakeForce × brakeMult`
- `linearDrag = base.linearDrag × dragMult`
- `maxFwd = base.maxFwd + maxFwdAdd`
- `maxRev = base.maxRev + maxRevAdd`
- `turnRate = base.turnRate × turnRateMult`
- `turnMin = base.turnMin + turnMinAdd` (con clamp)
- `gripCoast = base.gripCoast + gripCoastAdd`
- `gripDrive = base.gripDrive + gripDriveAdd`
- `gripBrake = base.gripBrake + gripBrakeAdd`

Esta arquitectura es ideal para crafting porque respeta diferencias relativas entre coches.

## 6. Upgrades legacy encontrados

Antes de Garage Fusion ya existían mejoras por niveles:

### Motor
Por nivel:
- `accelMult +8%`
- `maxFwdAdd +35 px/s`

### Frenos
Por nivel:
- `brakeMult +10%`

### Neumáticos
Por nivel:
- `gripDriveAdd +0.02`
- `gripCoastAdd +0.01`
- `gripBrakeAdd +0.015`

Estos números son una referencia histórica MUY importante: el crafting nuevo no debería superar alegremente esos incrementos en un solo salto de tier.

## 7. Garage Fusion actual

El nuevo sistema ya está conectado a la física real. `garageTuning()` produce los mismos tipos de modificadores que acepta `resolveCarParams()`, y `RaceScene` los combina con la progresión anterior.

Actualmente las piezas tienen valores provisionales. No se deben considerar balance final.

Familias actuales:

- motor → aceleración + velocidad máxima
- frenos → fuerza de frenado + grip durante frenada
- neumáticos → grip coast/drive/brake
- suspensión → turnRate + turnMin
- transmisión → aceleración

## 8. Regla de balance propuesta

Las piezas deben mejorar la ESPECIALIDAD del coche sin borrar su personalidad.

Ejemplo:

- un VELOCE con neumáticos mejores debe ganar control, pero no convertirse en un AVENIR;
- un AVENIR con motor mejor debe ganar salida/punta, pero conservar su ventaja de giro;
- un FORGE con suspensión mejor debe responder algo más rápido, pero debe seguir sintiéndose pesado.

Usar siempre modificadores relativos/aditivos pequeños sobre `CAR_SPECS`, nunca sustituir valores absolutos.

## 9. Siguiente paso antes de rebalancear

1. Extraer la tabla completa de los 15 coches oficiales.
2. Reconstruir relaciones `designStats → parámetros físicos` por familia/categoría.
3. Medir el impacto real de cada incremento legacy sobre tiempo de vuelta.
4. Definir Street / Sport / Racing / Prototype usando una progresión menor o igual al marco legacy salvo prueba en pista.
5. Mostrar en Workshop el efecto real antes/después de equipar una pieza.

## Conclusión

La documentación buscada estaba efectivamente implícita en el código. `carSpecs.js`, `handlingProfiles.js`, `resolveCarParams.js` y la lógica de tuning de `RaceScene` contienen el modelo y permiten reconstruir de dónde sale cada sensación de conducción. El crafting debe apoyarse en este sistema existente, no crear una segunda física paralela.
