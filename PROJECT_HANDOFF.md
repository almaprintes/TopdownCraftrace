# TopdownCraftrace — PROJECT HANDOFF

> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Actualizar este archivo cuando haya un cambio importante de arquitectura, render, pista, rendimiento, assets, deploy, progresión, economía o PWA.

## 1. Repositorio y flujo actual

- Repositorio: `almaprintes/TopdownCraftrace`
- Rama de trabajo actual: `main`
- Existe una rama/checkpoint de seguridad de la pista estable: `checkpoint-track-stable-2026-08-08`. No usarla para trabajo normal; conservarla como salvavidas.
- GitHub es la fuente oficial del código y del estado documentado del proyecto.
- Vercel se usa como banco de pruebas cuando es necesario; GitHub Pages sigue siendo destino previsto.

## 2. Dirección del juego

Objetivo visual: **arcade premium con base semi-realista**, vista cenital/top-down.

La pista debe sentirse como un circuito real estilizado. Dirección aceptada:

- asfalto mate gris oscuro cálido;
- desgaste longitudinal;
- transición asfalto → suciedad → césped;
- pianos rojo/blanco integrados;
- entorno con assets cenitales semirrealistas;
- HUD, pedales, minimapa, cronos y paneles como base válida.

La progresión del jugador se apoya además en carreras, botín de materiales, garaje, fabricación y evolución de piezas.

## 3. Pista — lecciones críticas

### 3.1 Retorcimiento de curvas

Se sufrió un problema grave en curvas pronunciadas: los bordes/líneas parecían retorcerse o invertir orientación. La pista estable actual se consiguió después de varias iteraciones de muestreo/geometría.

**Regla:** reutilizar el método estable de construcción de borde/arcén; no volver a offsets ingenuos por nodo ni depender de handles Bezier mal orientados.

### 3.2 Rendimiento

Hitos confirmados:

- pista/pianos: 8 vueltas seguidas sin ralentizaciones;
- vegetación: hasta ~28 sprites estáticos reutilizando 4 WebP y 5 composiciones;
- 8 vueltas completas con rendimiento absoluto, sin degradación progresiva.

Reglas: entorno construido una vez, evitar trabajo/objetos por frame, reutilizar texturas y validar 6–8 vueltas completas tras incrementos importantes.

## 4. Pianos / kerbs

Implementación actual aceptada. Deben seguir exactamente la trayectoria local, crecer hacia el ápice y volver a estrecharse, evitando discontinuidades, dientes o inversiones. Tratar la implementación estable como base protegida.

## 5. Entorno

Descartados los decorados de primitivas/procedural Canvas y la colocación aleatoria por su aspecto barato y poca coherencia espacial.

Enfoque vigente: **assets cenitales reales, preferentemente WebP transparentes**, colocados con dirección artística por zonas.

Ruta base: `public/assets/environment/`.

Assets inicialmente validados: `tree_deciduous_01.webp`, `tree_conifer_01.webp`, `shrub_round_01.webp`, `shrub_flowers_01.webp`.

`RaceEnvironmentLayer.js` es el punto de integración del entorno y debe mantenerse aislado de geometría, física, HUD y cronometraje.

Commits históricos relevantes: `90750a2`, `129ea6c`, `cd20adf`.

## 6. Cámara / zoom

Prueba de cámara abierta con valores aproximados: zoom min `0.62`, max `1.06`, referencia `110 km/h`, inicial `0.96`. Objetivo: mostrar más entorno y anticipar curvas sin alterar la física.

## 7. PWA / deploy

`vite.config.js` contempla base `/` en Vercel/Netlify y `/<repo>/` en GitHub Pages. Service worker en desarrollo usa estrategia network-first para evitar versiones atrapadas en caché.

Correcciones históricas de instalación iOS: manifest e iconos con rutas absolutas, `id: "/"`, `start_url: "/?source=pwa"`, `scope: "/"`.

Commits relevantes: `781ce28`, `dc4efb0`, `4cd5b72`, `d3ecc4e`.

## 8. Garaje, piezas y homologaciones

El garaje dispone de familias de piezas con cuatro categorías de progresión:

- Street
- Sport
- Racing
- Prototype

Familias actuales: motor, frenos, neumáticos, suspensión y transmisión.

Las piezas modifican estadísticas y tuning real del coche; la progresión no debe ser meramente cosmética. Se han realizado homologaciones y pruebas de comportamiento de coches, y las sensaciones/telemetría consolidadas deben conservarse como referencia para personalidad y equilibrio de cada vehículo.

### 8.1 Personalidad de coches

Las fichas del garaje deben incorporar una frase corta que describa actuación y personalidad de cada coche combinando sus skills reales con las sensaciones obtenidas durante homologación. No inventar esas sensaciones: usar los documentos consolidados de homologación/telemetría como fuente.

## 9. Fabricación — REDISEÑO 21/08/2026

### 9.1 Problema detectado

La mesa de fusión anterior exigía introducir tres elementos y descubrir/recordar combinaciones. Aunque funcionaba técnicamente, visualmente no comunicaba de inmediato qué debía hacer el jugador y el coste de fabricar piezas era demasiado bajo.

Decisión de diseño: **suma sencillez**. La fabricación debe entenderse de un vistazo en móvil.

### 9.2 Nuevo flujo

Se elimina como interfaz principal el concepto de probar combinaciones en una mesa de tres slots. El taller activo pasa a fabricación directa:

**FAMILIA → CATEGORÍA → REQUISITOS → FABRICAR**

El jugador:

1. elige familia (Motor, Frenos, Neumáticos, Suspensión o Transmisión);
2. elige Street / Sport / Racing / Prototype;
3. ve inmediatamente la pieza objetivo y todos sus requisitos;
4. cada material muestra `disponible / necesario` y una barra visual;
5. requisitos satisfechos se muestran como válidos y los insuficientes como faltantes;
6. el botón FABRICAR solo queda disponible cuando se cumplen todos los requisitos.

Los assets de las piezas siguen siendo protagonistas visuales; no sustituirlos por iconografía procedural cuando existe arte definitivo.

Archivo de la nueva interfaz: `src/game/scenes/UpgradeWorkshopSimpleCraftScene.js`

Activada desde: `src/game/game.js`

### 9.3 Nueva economía de fabricación

El requisito inicial de una sola unidad por material se consideró excesivamente fácil. Se decidió multiplicar aproximadamente por dos la primera propuesta de equilibrio.

Principio económico:

- **Street:** coste significativo pero alcanzable pronto;
- **Sport:** exige acumular claramente más botín;
- **Racing:** inversión importante;
- **Prototype:** objetivo de largo recorrido y fuerte sumidero de materiales.

Además, Sport consume la pieza Street anterior, Racing consume Sport y Prototype consume Racing. Esto crea una cadena de evolución y evita saltarse categorías.

Ejemplos del balance activo:

- Motor Street: 10 Chatarra + 8 Aleación + 4 Electrónica.
- Motor Sport: Motor Street + 18 Chatarra + 14 Aleación + 8 Electrónica.
- Motor Racing: Motor Sport + 32 Chatarra + 26 Aleación + 14 Electrónica.
- Motor Prototype: Motor Racing + 56 Chatarra + 46 Aleación + 28 Compuesto + 24 Electrónica.

Los costes completos están centralizados en `DIRECT_CRAFT_RECIPES` dentro de `src/game/garage/partsCatalog.js`.

### 9.4 Fabricar NO significa instalar

Decisión importante de UX/progresión: una pieza recién fabricada **no debe equiparse automáticamente**.

Flujo correcto:

**FABRICAR → INVENTARIO → decidir INSTALAR**

Tras fabricar, la pieza entra en inventario. Desde la propia fabricación puede abrirse la vista/modal de inventario mostrando la pieza recién creada y permitiendo instalarla. Si el coche ya tiene una pieza en ese slot, instalar la nueva debe desequipar la anterior y devolverla al inventario.

Debe existir siempre una sola pieza equipada por slot. El jugador debe poder distinguir con claridad `INSTALADA` de `EN INVENTARIO`.

### 9.5 Límite Prototype

Prototype es el nivel máximo. Nunca debe existir una evolución circular `Prototype → Street` ni cualquier degradación accidental al intentar evolucionar una Prototype. Si se intenta evolucionar una pieza máxima, la acción debe bloquearse/comunicar que ya está en el nivel máximo.

### 9.6 Compatibilidad

Las recetas antiguas se mantienen temporalmente en `GARAGE_RECIPES` / `CRAFT_STRIP_RECIPES` por compatibilidad con código o partidas anteriores, pero **la interfaz activa del taller utiliza `DIRECT_CRAFT_RECIPES`**.

No volver a presentar la mesa de tres componentes como flujo principal salvo decisión explícita posterior.

### 9.7 Assets de piezas

Todas las familias, incluida transmisión, deben mostrar su asset real cuando exista. Evitar placeholders/procedurales. Los assets deben aprovechar bien el área disponible y conservar nitidez.

### 9.8 Commits base del hito

- `06c7c0f` — nueva escena de fabricación directa y simplificada.
- `c84afd3` — recetas directas y nuevo balance de materiales.
- `12c6524` — activación del nuevo taller en `game.js`.

## 10. Inventario — REDISEÑO 21/08/2026

La ventana principal de INVENTARIO ya no debe ser únicamente un contador de materiales. Se divide en dos pestañas:

**MATERIALES | PIEZAS**

### 10.1 Materiales

- Usar los assets reales de Chatarra, Aleación, Goma, Compuesto, Disco metálico, Muelle, Engranaje y Electrónica.
- No usar símbolos procedurales si existe asset.
- La imagen debe aprovechar el espacio de la tarjeta sin quedar diminuta.
- Nombre y cantidad deben ser legibles y no solaparse.
- Se descartó el verde intenso de las cantidades por desentonar y competir con el nombre; mantener una jerarquía visual limpia.

### 10.2 Piezas

- Mostrar piezas fabricadas y pieza equipada.
- Marcos de categoría muy evidentes, usando el color correspondiente al tier.
- La pieza instalada se distingue claramente de las almacenadas.
- Se eliminó la etiqueta redundante de categoría en la esquina superior izquierda porque tapaba arte y la categoría ya figura en el nombre.
- Orden por defecto: **nivel más bajo primero, nivel más alto después**; dentro del mismo nivel, orden coherente por familia/nombre.

### 10.3 Filtros de categoría

En la pestaña PIEZAS hay cuatro botones compactos de filtro, manteniendo el código cromático de las categorías.

La nomenclatura definitiva del filtro es:

- `I` = Street
- `II` = Sport
- `III` = Racing
- `IV` = Prototype

Pulsar un nivel filtra solo ese tier; volver a pulsarlo quita el filtro y recupera la vista completa. Esta solución se prefiere a abreviaturas `ST/SP/RC/PT` por ser más limpia y universal.

Archivo principal de esta interfaz: `src/game/scenes/MenuInventoryAssetsScene.js`.

Commit del cambio de numeración romana: `910667f116960bd4daf728ecaa0b30ace81a6e5d`.

## 11. Supervivencia, resultados y recompensas — avance 20–21/08/2026

### 11.1 Cofre y botín

Las pantallas de botín/recompensas deben usar los assets reales de materiales, nunca iconografía procedural cuando el asset existe. En las tarjetas de apertura de cofre el asset debe ocupar visualmente buena parte del área y estar centrado, no arrinconado ni diminuto.

### 11.2 Info de sesión

La modal de información post-sesión debe caber dentro del viewport en móvil apaisado y permitir acceso a sus controles inferiores; usar scroll interno cuando sea necesario, no dejar botones fuera de pantalla.

La tabla de vueltas de Supervivencia debe seguir el mismo lenguaje de cronometraje por sectores que los otros modos:

`VUELTA | S1 | S2 | S3 | TOTAL`

No fabricar un S3 residual a partir de diferencias minúsculas. Si no existe un split válido de S3, mostrar `—`. Un valor como `0.034` no constituye por sí mismo un sector real y fue identificado como dato ilógico.

### 11.3 Premios de eventos

La modal de evento completado también debe representar Engranaje, Compuesto, Electrónica y demás materiales con sus assets reales, eliminando los procedurales restantes.

## 12. Circuito Santa Cruz y editor — avance 20/08/2026

Se trabajó un nuevo circuito Santa Cruz a partir de una silueta cerrada. La pista tuvo que ensancharse de forma importante manteniendo su forma y separando los dos tramos que colisionaban en la zona central estrecha. Regla aprendida: no deformar globalmente la geometría para ganar anchura; modificar anchura de pista y separación local conservando la identidad del trazado.

En el editor se incorporaron assets específicos de Santa Cruz, incluido el Auditorio y otros elementos preparados como WebP transparentes. La biblioteca de assets debe permitir seleccionarlos y hacer scroll sin cerrar accidentalmente la modal.

En el selector de circuito, mantener separación clara entre la miniatura del trazado y los datos inferiores (longitud, sectores, superficie, sentido), evitando que el texto toque la línea inferior del recuadro del mapa.

## 13. UI del menú — correcciones recientes

- Panel de EVENTO: evitar solapes entre título, descripción, premio y progreso.
- Panel CIRCUITO: separar métricas de la caja de la silueta del trazado.
- Priorizar nitidez tipográfica; evitar texto reescalado/blando cuando puede renderizarse directamente a resolución adecuada.
- En tarjetas con arte disponible, ampliar el asset para aprovechar el espacio útil en vez de dejar grandes zonas vacías.

## 14. Reglas de trabajo

1. Leer este archivo antes de tocar el proyecto.
2. No romper pista, pianos, física, HUD, minimapa ni cronometraje al trabajar otras capas.
3. Hacer cambios pequeños y comprobables.
4. Probar rendimiento durante varias vueltas completas.
5. No usar decoración ni iconografía procedural barata donde existan assets finales.
6. No colocar entorno aleatoriamente: diseñar zonas coherentes.
7. Mantener GitHub como fuente oficial.
8. Conservar homologaciones, telemetría y sensaciones de coches como datos de diseño, no como conversación desechable.
9. Actualizar este `PROJECT_HANDOFF.md` tras cada solución técnica importante o cambio de flujo/economía.
10. Nunca afirmar que un cambio está hecho sin haber realizado y confirmado el commit correspondiente.

## 15. Próximas validaciones

1. Probar en iPhone el taller completo: fabricar una pieza y confirmar que entra en inventario sin autoequiparse.
2. Instalarla manualmente y confirmar que la pieza sustituida vuelve al inventario.
3. Verificar que nunca existen dos piezas simultáneamente equipadas en un mismo slot.
4. Confirmar bloqueo absoluto de evolución por encima de Prototype.
5. Validar assets de transmisión en todas las pantallas.
6. Probar filtros `I / II / III / IV`, orden ascendente de tiers y paginación del inventario.
7. Revisar nitidez y tamaño de assets/textos en iPhone real.
8. Validar tablas S1/S2/S3/TOTAL de Supervivencia con varias sesiones y circuitos.
9. Tras varias carreras, contrastar botín obtenido frente a los nuevos costes de fabricación y ajustar economía si la progresión queda demasiado rápida o excesivamente lenta.
10. Continuar enriqueciendo Santa Cruz con assets del editor sin comprometer legibilidad ni rendimiento.
