# Monte Carlo de progresión completa de piezas

Fecha: 2026-08-21
Estado: **recalibrado para objetivo de 50 h con duplicación recompensada**

## Objetivo de diseño

El jugador avanzado que optimiza la progresión y acepta el anuncio recompensado tras cada carrera para **duplicar todo el botín** debe tardar **al menos unas 50 horas activas** en completar un coche con las cinco piezas Prototype.

Esto convierte un coche Prototype completo en un hito de largo recorrido. Maxear 15 coches supone, de forma aproximada, un objetivo del orden de **750 h** para un jugador que mantuviera ese ritmo y duplicara sistemáticamente recompensas.

Street se mantiene intencionadamente accesible: la primera pieza Street debe poder aparecer durante la primera sesión. El endurecimiento se concentra sobre todo en Sport, Racing y Prototype.

## Modelo de drop usado

Se conserva el sistema implementado:

- Chatarra: 38 % de las tiradas, lote 2–4.
- Aleación/Goma/Disco/Muelle/Engranaje: 10 % cada una, lote 1–3.
- Compuesto: 8 %, lote 1–2.
- Electrónica: 4 %, lote 1.
- corrección adaptativa para converger suavemente a estas cuotas;
- Supervivencia completa de 5 vueltas: ~15 tiradas de media;
- inventario inicial de materiales: 0.

Para esta calibración se modeló al jugador más eficiente económicamente: **duplica mediante rewarded ad el botín de cada carrera completa**.

## Recetas recalibradas

Cada familia conserva exactamente la misma estructura matemática. Solo cambia su material secundario:

- Motor → Aleación.
- Frenos → Disco metálico.
- Neumáticos → Goma.
- Suspensión → Muelle.
- Transmisión → Engranaje.

### I · Street

`Chatarra ×8 + secundario ×2`

### II · Sport

`pieza Street ×1 + Chatarra ×185 + secundario ×160 + Compuesto ×20`

### III · Racing

`pieza Sport ×1 + Chatarra ×820 + secundario ×720 + Compuesto ×86 + Electrónica ×29`

### IV · Prototype

`pieza Racing ×1 + Chatarra ×2400 + secundario ×2100 + Compuesto ×250 + Electrónica ×84`

Los números grandes son deliberados: el drop de materiales sigue siendo abundante y además el jugador óptimo puede duplicarlo tras cada carrera. La dificultad debe sobrevivir a esa aceleración sin romper la igualdad entre familias.

## Monte Carlo con duplicación tras cada carrera

Se ejecutó una nueva batería de **2.000 jugadores virtuales** desde inventario cero, aplicando la duplicación del botín en cada sesión completa.

| Objetivo acumulado | Media de sesiones | P50 | P90 |
|---|---:|---:|---:|
| 5 Street | **1,86** | 2 | 2 |
| 5 Sport | **31,02** | 31 | 33 |
| 5 Racing | **155,29** | 155 | 160 |
| 5 Prototype | **511,34** | 510 | 520 |

La dispersión sigue siendo pequeña gracias al sistema adaptativo.

## Conversión a horas

Tomando 6 minutos de carrera/sesión completa como referencia de trabajo:

- 5 Street: ~0,19 h.
- 5 Sport: ~3,10 h acumuladas.
- 5 Racing: ~15,53 h acumuladas.
- 5 Prototype: **~51,13 h acumuladas**.

El P90 de Prototype ronda 520 sesiones, equivalente a **~52 h** de carrera activa con esa referencia.

Si además contamos, por ejemplo, ~30 segundos de vídeo por sesión recompensada, 511 sesiones añaden unas 4,3 h de consumo real, elevando el recorrido total por encima de 55 h de tiempo de usuario. La duración real del anuncio dependerá del proveedor y no se fija como parte del balance base.

## Lectura de progresión

La curva queda aproximadamente así para el jugador más eficiente:

- Street: recompensa inicial y tutorial práctico.
- Sport: primer objetivo de varias horas.
- Racing: progreso serio de medio plazo.
- Prototype: meta principal de unas 50 h activas aun explotando al máximo la duplicación recompensada.

Sin duplicar botín sistemáticamente, el tiempo esperado será sensiblemente mayor y puede acercarse aproximadamente al doble, aunque no exactamente por el carácter discreto/adaptativo del drop.

## Regla de monetización

El rewarded ad posterior a carrera debe ser **opcional**. Duplica el botín conseguido en esa carrera; no altera los requisitos de receta ni concede una pieza directamente. Así monetiza aceleración sin convertir la tienda/anuncio en una fuente exclusiva de potencia.

## Archivos de producción

- `src/game/garage/partsCatalog.js` — requisitos de fabricación.
- `src/game/garage/garageStore.js` — drop adaptativo y entrega de botín.

Commit de la recalibración de recetas: `ed44c90a`.

## Validaciones pendientes

1. Medir duración real de una Supervivencia completa en jugadores rápidos para sustituir la referencia de 6 min por telemetría real.
2. Implementar el rewarded ad post-carrera y validar que la duplicación afecta exactamente al botín de la carrera terminada una sola vez.
3. Repetir Monte Carlo con duraciones reales y con tasas reales de aceptación del anuncio (0 %, 25 %, 50 %, 75 %, 100 %).
4. Medir cuántos materiales sobrantes se acumulan por tier para detectar un cuello de botella excesivo.
5. Reequilibrar los packs de tienda contra esta nueva escala para evitar que una compra pequeña destruya semanas de progresión.
