# Modelo matemático de equilibrio DROP → CRAFT

Fecha: 2026-08-21
Estado: **primera calibración implementada en `main`**

## Objetivo innegociable

Dentro de un mismo tier, Motor, Frenos, Neumáticos, Suspensión y Transmisión deben tener prácticamente la misma dificultad de fabricación. La dificultad la determina la categoría, no la familia elegida:

**I Street < II Sport < III Racing < IV Prototype**.

Desde Sport se consume siempre la pieza inmediatamente anterior de la misma familia.

## Decisiones ya aplicadas

- Inventario inicial de materiales: **0**.
- Street no utiliza materiales raros: el jugador debe poder elegir libremente su primera mejora.
- Las cinco familias tienen la misma estructura matemática de receta.
- Chatarra es el principal sumidero y el material de mayor frecuencia.
- Compuesto entra desde Sport.
- Electrónica entra desde Racing.
- Se elimina el antiguo sesgo fuerte por afinidades de circuito y el pity independiente de ECU como motor económico.
- El drop pasa a un modelo adaptativo: azar a corto plazo + convergencia suave hacia cuotas globales a largo plazo.

## Rareza y cuota objetivo de los materiales

| Material | Rareza | Cuota objetivo por tiradas |
|---|---|---:|
| Chatarra | Común | **38 %** |
| Aleación | Poco común | **10 %** |
| Goma | Poco común | **10 %** |
| Disco metálico | Poco común | **10 %** |
| Muelle | Poco común | **10 %** |
| Engranaje | Poco común | **10 %** |
| Compuesto | Raro | **8 %** |
| Electrónica | Épico | **4 %** |

Las cinco materias específicas de familia tienen exactamente la misma cuota del 10 %. Esto es deliberado: evita que fabricar Motor, Frenos, Ruedas, Suspensión o Transmisión sea objetivamente más difícil dentro de un mismo nivel.

Estas cifras son cuotas de convergencia, **no una secuencia fija**. Cada tirada pondera más los materiales que van por debajo de su cuota acumulada y menos los que van por encima, manteniendo además una pequeña variación aleatoria.

## Corrección adaptativa

Para material `m`, tras `N` tiradas:

`esperado_m = (N + 1) × p_m`

`déficit_m = (esperado_m - obtenido_m) / max(0.5, esperado_m)`

`peso_m = p_m × exp(2 × déficit_m) × jitter`

con `jitter` aleatorio aproximado entre 0.90 y 1.10.

La selección sigue siendo aleatoria, pero una mala racha no puede alejar indefinidamente al jugador del equilibrio previsto.

## Cantidad entregada por tirada

Una tirada selecciona un material y después determina el tamaño del lote:

- Chatarra: **2–4** unidades.
- Aleación / Goma / Disco / Muelle / Engranaje: **1–3** unidades.
- Compuesto: **1–2** unidades.
- Electrónica: **1** unidad.

Por tanto, la cuota de tiradas y la cantidad de unidades por tirada trabajan juntas. Una Chatarra frecuente también llega en lotes mayores, lo que justifica requisitos numéricos mucho más altos en tiers superiores.

## Recetas implementadas

Cada familia usa una materia secundaria propia:

- Motor → Aleación.
- Frenos → Disco metálico.
- Neumáticos → Goma.
- Suspensión → Muelle.
- Transmisión → Engranaje.

### I · Street

Todas: **Chatarra ×8 + material de familia ×2**.

Ejemplos:
- Motor Street: Chatarra ×8 + Aleación ×2.
- Frenos Street: Chatarra ×8 + Disco ×2.
- Neumáticos Street: Chatarra ×8 + Goma ×2.
- Suspensión Street: Chatarra ×8 + Muelle ×2.
- Transmisión Street: Chatarra ×8 + Engranaje ×2.

### II · Sport

Todas: **pieza Street ×1 + Chatarra ×28 + material de familia ×5 + Compuesto ×3**.

### III · Racing

Todas: **pieza Sport ×1 + Chatarra ×50 + material de familia ×9 + Compuesto ×5 + Electrónica ×2**.

### IV · Prototype

Todas: **pieza Racing ×1 + Chatarra ×90 + material de familia ×16 + Compuesto ×10 + Electrónica ×3**.

Así, dentro de cada tier solo cambia el material específico de la familia; el esfuerzo esperado es simétrico.

## Calibración de primera sesión — Monte Carlo

Se simuló la receta Street desde inventario cero con el modelo adaptativo y decenas de miles de jugadores virtuales.

Probabilidad aproximada de poder fabricar cada Street según tiradas acumuladas:

| Tiradas | Probabilidad por familia | Diferencia máx. entre familias |
|---:|---:|---:|
| 12 | ~70,3–70,7 % | ~0,4 pp |
| 13 | ~75,1–75,6 % | ~0,5 pp |
| 14 | ~79,4–80,1 % | ~0,7 pp |
| **15** | **~82,5–82,9 %** | **~0,4 pp** |
| 16 | ~85,6–86,1 % | ~0,6 pp |
| 17 | ~87,9–88,6 % | ~0,7 pp |

Objetivo aprobado: alrededor de **80–85 %** de probabilidad para cualquiera de las cinco Street tras una primera sesión completa. La calibración elegida es aproximadamente **15 tiradas**.

## Traducción a Supervivencia

Supervivencia tiene 6 coches y elimina uno por ronda, por lo que una partida completa alcanza aproximadamente 5 vueltas/rondas.

El nuevo `grantRaceLoot()` entrega:

- 2 tiradas garantizadas por vuelta = 10 en cinco vueltas.
- 60 % de probabilidad de una tercera tirada en cada vuelta = ~3 adicionales de media.
- Cofre de la vuelta 5 = 2 tiradas adicionales.

Total esperado de una partida completa de cinco vueltas: **~15 tiradas**.

Esto alinea directamente la duración real del modo con el objetivo de fabricar la primera Street.

## Coste de colecciones completas

El escalado está pensado también para que completar las cinco piezas de cada categoría sea progresivamente más exigente:

- Street: primera colección relativamente rápida; cada pieza individual es viable desde las primeras sesiones.
- Sport: primer salto serio y entrada del Compuesto.
- Racing: introduce Electrónica y requiere acumulación de varias sesiones.
- Prototype: fuerte sumidero final de materiales y objetivo de largo recorrido.

La igualdad entre familias es estructural: cambiar de Motor a Neumáticos no cambia la dificultad matemática, solo el material secundario requerido.

## Archivos de producción

- Recetas y rarezas: `src/game/garage/partsCatalog.js`.
- Drop adaptativo y persistencia: `src/game/garage/garageStore.js`.

Commits del hito:

- `a7a12487` — retirada del kit inicial de materiales.
- `9cc50b19` — recetas simétricas y rarezas por material.
- `a1d25c36` — sistema de drop adaptativo y calibración de ~15 tiradas por Supervivencia completa.

## Validaciones reales pendientes

1. Jugar varias partidas nuevas desde inventario cero y contrastar el comportamiento con la simulación.
2. Verificar que los cinco tipos de Street resultan igual de alcanzables en experiencia real.
3. Medir materiales sobrantes después de 5, 10 y 20 sesiones.
4. Medir tiempo real para completar colecciones I, II, III y IV.
5. Rebalancear packs de tienda usando esta misma valoración; no vender materiales con precios arbitrarios.
6. Mantener telemetría de drops para poder ajustar cuotas sin rehacer las recetas.
