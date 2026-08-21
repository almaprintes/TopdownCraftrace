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

Archivo de la nueva interfaz:

`src/game/scenes/UpgradeWorkshopSimpleCraftScene.js`

Activada desde:

`src/game/game.js`

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

Los costes completos de las cinco familias están centralizados en `DIRECT_CRAFT_RECIPES` dentro de:

`src/game/garage/partsCatalog.js`

### 9.4 Compatibilidad

Las recetas antiguas se mantienen temporalmente en `GARAGE_RECIPES` / `CRAFT_STRIP_RECIPES` por compatibilidad con código o partidas anteriores, pero **la interfaz activa del taller utiliza `DIRECT_CRAFT_RECIPES`**.

No volver a presentar la mesa de tres componentes como flujo principal salvo decisión explícita posterior.

### 9.5 Commits del hito

- `06c7c0f` — nueva escena de fabricación directa y simplificada.
- `c84afd3` — recetas directas y nuevo balance de materiales.
- `12c6524` — activación del nuevo taller en `game.js`.

### 9.6 Validación pendiente

El cambio está implementado pero requiere prueba real en iPhone. Criterio de aceptación UX: al entrar en FABRICACIÓN, un jugador debe comprender inmediatamente qué pieza puede fabricar, qué le falta y qué botón debe pulsar, sin necesidad de aprender previamente el sistema.

También habrá que observar el ritmo real de obtención de materiales durante varias sesiones. Los números actuales son un punto de balance deliberadamente más exigente, no deben considerarse definitivos hasta contrastarlos con la economía de botín.

## 10. Reglas de trabajo

1. Leer este archivo antes de tocar el proyecto.
2. No romper pista, pianos, física, HUD, minimapa ni cronometraje al trabajar otras capas.
3. Hacer cambios pequeños y comprobables.
4. Probar rendimiento durante varias vueltas completas.
5. No usar decoración procedural barata donde existan assets finales.
6. No colocar entorno aleatoriamente: diseñar zonas coherentes.
7. Mantener GitHub como fuente oficial.
8. Conservar homologaciones, telemetría y sensaciones de coches como datos de diseño, no como conversación desechable.
9. Actualizar este `PROJECT_HANDOFF.md` tras cada solución técnica importante o cambio de flujo/economía.

## 11. Próximo paso inmediato

1. Probar en iPhone el nuevo taller de fabricación directa.
2. Verificar legibilidad, tamaño táctil y ausencia de desbordamientos en apaisado.
3. Fabricar al menos una pieza Street y comprobar descuento correcto de materiales e incorporación al inventario.
4. Verificar que Sport/Racing/Prototype exigen correctamente la pieza del nivel inmediatamente anterior.
5. Tras varias carreras de Supervivencia/eventos, contrastar botín obtenido frente a los nuevos costes y ajustar economía si la progresión queda demasiado rápida o excesivamente lenta.
