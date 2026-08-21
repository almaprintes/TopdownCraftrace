# Monte Carlo de progresión completa de piezas

Fecha: 2026-08-21
Estado: **recalibrado y verificado tras normalización temporal del botín y límite de 10 vueltas**

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
- inventario inicial de materiales: 0.

### Cambio 2026-08-21: normalización temporal

El botín deja de depender del número bruto de vueltas y pasa a depender del **tiempo competitivo validado**. Esto evita que circuitos extremadamente cortos, como Circuito Atlántico, se conviertan en la opción óptima para farmear materiales.

El sistema conserva crédito fraccional entre sesiones, por lo que una carrera corta no pierde valor por redondeos. A largo plazo, dos circuitos de distinta longitud deben converger al mismo rendimiento por hora de conducción válida.

Protecciones activas:

- una vuelta lenta no puede aumentar artificialmente el crédito de loot;
- si existe referencia válida, solo se acredita como máximo el 125 % de la referencia más rápida conocida;
- primera vuelta sin referencia: tope duro de 90 s acreditables;
- el crédito sobrante se conserva en `lootTimeCredit` entre sesiones.

### Cadencia definitiva de tiradas

Durante la primera implementación temporal se configuró accidentalmente una cadencia de ~15 tiradas cada 225 s, equivalente a **240 tiradas/hora**. Eso habría reducido la progresión Prototype prevista de ~51 h a aproximadamente ~32 h activas.

Se ha corregido para preservar exactamente la referencia económica usada en el Monte Carlo original:

- 10 tiradas base cada 360 s → 100 tiradas/h.
- 3 tiradas bonus cada 360 s → 30 tiradas/h.
- 1 cofre cada 360 s con 2 tiradas → 20 tiradas/h.
- **Total base: 150 tiradas/hora.**
- Con rewarded ×2 tras cada sesión: **300 tiradas-equivalentes/hora** para el optimizador.

Esta corrección mantiene la progresión objetivo sin volver a premiar los circuitos cortos.

## Límite de sesión en Fantasma y Contrarreloj

Los modos `ghost` y `timeattack` tienen ahora un **máximo de 10 vueltas por sesión**.

Al finalizar la vuelta 10:

1. se cierra la tanda;
2. no puede registrarse una vuelta 11;
3. se abre el informe normal de fin de sesión;
4. se presenta el botín obtenido en esa tanda;
5. se mantiene el flujo de rewarded para duplicación ×2 del botín cuando esté integrado.

El límite de 10 vueltas **no cambia el rendimiento por hora**, porque el crédito de loot depende del tiempo validado y el crédito fraccional persiste entre sesiones. Su función es:

- evitar tandas ilimitadas con grandes acumulaciones;
- crear puntos naturales de cierre y monetización;
- mejorar comparabilidad de sesiones;
- impedir sesiones largas sin oportunidad de rewarded.

Supervivencia y otros modos conservan sus propias reglas de duración.

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

La batería base ejecutada con **2.000 jugadores virtuales** desde inventario cero produjo:

| Objetivo acumulado | Media de sesiones | P50 | P90 |
|---|---:|---:|---:|
| 5 Street | **1,86** | 2 | 2 |
| 5 Sport | **31,02** | 31 | 33 |
| 5 Racing | **155,29** | 155 | 160 |
| 5 Prototype | **511,34** | 510 | 520 |

La dispersión sigue siendo pequeña gracias al sistema adaptativo.

## Conversión a horas — verificación tras los cambios

La simulación original utilizaba como referencia 15 tiradas por 6 min, es decir **150 tiradas/hora** antes de rewarded.

La implementación temporal corregida vuelve a producir exactamente esa misma cadencia de largo plazo. Por tanto, los tiempos objetivo se mantienen:

- 5 Street: **~0,19 h** acumuladas (~11–12 min).
- 5 Sport: **~3,10 h** acumuladas.
- 5 Racing: **~15,53 h** acumuladas.
- 5 Prototype: **~51,13 h** de carrera activa.

P90 Prototype: ~520 sesiones equivalentes → **~52 h** de conducción activa bajo la referencia de trabajo.

Si se añade un rewarded de ~30 s tras cada sesión completa y el jugador optimizador lo acepta siempre, el recorrido total de interacción supera aproximadamente **55 h** por coche.

### Verificación del límite de 10 vueltas

El límite no altera estos tiempos de largo plazo porque:

- las tiradas dependen del tiempo acreditado, no de `lapCount`;
- el sobrante de tiempo se conserva entre sesiones;
- la longitud del circuito solo modifica cuántas vueltas caben dentro de un mismo bloque temporal;
- cerrar a 10 vueltas cambia el ritmo de sesiones, pero no la generación esperada de materiales por hora.

Por ello, Circuito Atlántico deja de tener ventaja económica frente a circuitos más largos.

## Lectura de progresión

La curva queda aproximadamente así para el jugador más eficiente:

- Street: recompensa inicial y tutorial práctico.
- Sport: primer objetivo de varias horas.
- Racing: progreso serio de medio plazo.
- Prototype: meta principal de unas 50 h activas aun explotando al máximo la duplicación recompensada.

Sin duplicar botín sistemáticamente, el tiempo esperado será sensiblemente mayor y puede acercarse aproximadamente al doble, aunque no exactamente por el carácter discreto/adaptativo del drop.

## Regla de monetización

El rewarded ad posterior a carrera debe ser **opcional**. Duplica el botín conseguido en esa carrera/sesión; no altera los requisitos de receta ni concede una pieza directamente. Así monetiza aceleración sin convertir la tienda/anuncio en una fuente exclusiva de potencia.

La normalización temporal y el límite de 10 vueltas hacen que el rewarded aparezca en puntos de sesión previsibles y que ningún circuito permita eludir económicamente ese ritmo.

## Archivos de producción

- `src/game/garage/partsCatalog.js` — requisitos de fabricación.
- `src/game/garage/garageStore.js` — drop adaptativo, crédito temporal persistente y cadencia de loot.
- `src/game/scenes/RaceSessionLapCapScene.js` — límite de 10 vueltas para Ghost/Time Attack.
- cadena de escenas de carrera — integración del cierre automático de sesión.

## Commits relevantes

- `ed44c90a` — recalibración de recetas para objetivo ~50 h.
- `8ba7dd5f` — primera normalización de loot por tiempo.
- `3dee0d8f` — persistencia del crédito temporal entre sesiones.
- `ef5b5546` — límite de 10 vueltas en Fantasma/Contrarreloj.
- `b3670070` — corrección de cadencia temporal para preservar ~50 h Prototype.

## Validaciones pendientes

1. Medir con telemetría real el tiempo medio de vuelta/sesión por circuito y por percentiles de habilidad.
2. Validar en dispositivo que la vuelta 10 cierra correctamente tanto Ghost como Time Attack y nunca entra una vuelta 11.
3. Implementar/validar el rewarded post-sesión para que duplique exactamente el botín consolidado de esa tanda una sola vez.
4. Ejecutar telemetría comparativa de materiales/hora entre Atlántico, circuito medio y circuito largo; objetivo: desviación mínima y sin ventaja sistemática por longitud.
5. Repetir Monte Carlo con tasas reales de aceptación del rewarded (0 %, 25 %, 50 %, 75 %, 100 %).
6. Medir cuántos materiales sobrantes se acumulan por tier para detectar un cuello de botella excesivo.
7. Reequilibrar los packs de tienda contra esta escala para evitar que una compra pequeña destruya semanas de progresión.
