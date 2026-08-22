# TopdownCraftrace — PROJECT HANDOFF

> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Actualizar este archivo cuando haya un cambio importante de arquitectura, render, pista, rendimiento, assets, deploy, progresión, economía o PWA.

## Estado consolidado hasta 21/08/2026

Se mantiene como base todo lo ya validado del proyecto: pista estable y pianos sin retorcimiento, rendimiento protegido, entorno basado en assets reales, cámara abierta, PWA/deploy, garaje con homologaciones y personalidad de coches, fabricación directa, inventario de materiales/piezas, resultados por sectores y circuito Santa Cruz.

### Reglas permanentes

- GitHub (`almaprintes/TopdownCraftrace`, rama `main`) es la fuente oficial.
- No romper pista, pianos, física, HUD, minimapa ni cronometraje al modificar otras capas.
- Evitar procedurales cuando exista un asset definitivo.
- Assets protagonistas, grandes y nítidos; textos renderizados con buena resolución.
- Las homologaciones, telemetría y sensaciones de coches son datos de diseño persistentes.
- Nunca afirmar que un cambio está hecho sin commit confirmado.

## Fabricación e inventario — decisiones vigentes

Fabricación simplificada: **FAMILIA → CATEGORÍA → REQUISITOS → FABRICAR**. Categorías Street, Sport, Racing y Prototype. Los costes están en `DIRECT_CRAFT_RECIPES` y escalan fuertemente por nivel. Sport consume Street, Racing consume Sport y Prototype consume Racing. Prototype es el máximo y nunca puede volver a Street.

Fabricar NO instala automáticamente. Flujo: **FABRICAR → INVENTARIO → decidir INSTALAR**. Solo una pieza equipada por slot; al instalar otra, la anterior vuelve al inventario. Desde Factory debe poder abrirse Inventario y desde Inventario instalar/desinstalar piezas.

Inventario: pestañas **MATERIALES | PIEZAS**. Materiales con assets reales. Piezas ordenadas por nivel ascendente y marcos cromáticos fuertes. La pieza instalada debe verse menos disponible/apagada sin contaminar el color del tier. Filtros: `I` Street, `II` Sport, `III` Racing, `IV` Prototype.

## Supervivencia/resultados — decisiones vigentes

Botín, cofres y premios de eventos deben usar assets reales de materiales. Las modales deben caber en móvil apaisado y conservar acceso a controles inferiores. Tablas: `VUELTA | S1 | S2 | S3 | TOTAL`; no inventar residuos como S3 (por ejemplo 0.034). Si no hay split válido, `—`.

## Economía y monetización — TIENDA 21/08/2026

La subida importante de requisitos de materiales de fabricación hace necesaria una economía complementaria que permita acelerar progreso sin bloquear el juego normal.

### Modelo aprobado

Tres vías principales:

1. **Packs de materiales por moneda del juego.**
2. **Packs de monedas por dinero real.**
3. **Vídeo recompensado cada 4 horas** para conseguir monedas gratuitamente.

Se mantiene además un regalo diario gratuito. La intención es una monetización integrada en la progresión y compatible con una presentación apropiada para Shipaton: recompensas opcionales y aceleradores, no una barrera obligatoria para jugar.

### Asset oficial de moneda

Asset: `assets/ui/moneda-tdr.webp`.

Debe sustituir los símbolos procedurales del saldo de monedas en todas las pantallas. Helper actual: `src/game/ui/CoinAssetUi.js`. La moneda debe verse como elemento gráfico real, no como rombo/círculo tipográfico.

### Diseño de tienda

Dirección visual: tienda arcade premium inspirada en la claridad y espectacularidad de tiendas móviles tipo Brawl Stars, sin copiar su arte.

- tarjetas grandes;
- imagen protagonista ocupando gran parte de cada tarjeta;
- scroll horizontal táctil;
- color/acento fuerte por oferta;
- barra superior de acceso directo a secciones;
- navegación especialmente cómoda en iPhone apaisado.

Archivo principal actual: `src/game/scenes/MenuStoreScene.js`.

### Cambio fundamental de navegación — 21/08/2026

Se descarta que `MATERIALES`, `MONEDAS` y `RECOMPENSAS` sean tres pantallas independientes.

La tienda es **un único catálogo horizontal continuo**:

**MATERIALES → MONEDAS → RECOMPENSAS**

El jugador puede recorrer todo el catálogo con el dedo sin cambiar de pantalla. Los botones superiores son **anclas/accesos directos**: al tocar uno, el scroll salta hasta el comienzo de esa zona, pero el contenido continúa antes y después.

Esto debe conservarse como decisión de UX; no volver a convertir las secciones en pantallas separadas salvo decisión explícita posterior.

### Packs de monedas y precios de referencia

Primer escalón comercial aprobado para presentación/desarrollo:

- **2.500 monedas — 1,99 €**
- **7.500 monedas — 4,99 €**
- **20.000 monedas — 9,99 €**

Estos precios son actualmente precios de diseño/simbólicos. La compra continúa simulada internamente hasta integrar el proveedor real de IAP.

### Presentación gráfica de packs de monedas

No mostrar una moneda diminuta aislada en el centro de una tarjeta grande.

Escala visual progresiva:

- 2.500: **moneda grande**;
- 7.500: **montón/bolsa visual de monedas**;
- 20.000: **montaña de monedas**.

Las composiciones actuales se construyen reutilizando el asset oficial `moneda-tdr.webp`. El objetivo es que el aumento de valor se perciba antes incluso de leer la cifra.

### Recompensa por vídeo

- recompensa actual: **+250 monedas**;
- cooldown: **4 horas**;
- debe comunicar claramente cuándo vuelve a estar disponible;
- el vídeo es opcional y recompensado, nunca intersticial forzado dentro de este flujo.

### Regalo diario

Recompensa inicial actual: **+100 monedas**. Mantener como incentivo gratuito separado del vídeo recompensado.

### Packs de materiales

Se mantienen packs temáticos comprables con moneda del juego (mecánica/chasis/tecnología y posteriores). Deben mostrar los assets reales de los materiales incluidos, cantidades y coste de forma inmediata. Estos packs sirven como sumidero de moneda y puente entre carreras, recompensas y fabricación.

### Commits relevantes de tienda

- `cf7e356df38edc31f423d2cf666e4773cbd8daeb` — tienda convertida en catálogo horizontal continuo, navegación por anclas y nueva presentación de packs de monedas con precios 1,99/4,99/9,99 € y composiciones crecientes del asset de moneda.

## Próximas validaciones prioritarias

1. Probar en iPhone el scroll horizontal completo Materiales → Monedas → Recompensas.
2. Confirmar que los botones superiores saltan a la sección correcta sin reconstruir/cambiar de pantalla.
3. Evaluar visualmente la transición entre secciones para que el catálogo parezca una tienda única y premium.
4. Revisar tamaño de moneda/montón/montaña en dispositivo real y aprovechar mejor el área de cada tarjeta si todavía queda vacío.
5. Mantener compra real desactivada hasta integrar IAP de App Store/Google Play; no confundir los precios visuales actuales con transacciones productivas.
6. Validar cooldown real del vídeo recompensado y persistencia al cerrar/reabrir el juego.
7. Contrastar después de varias carreras cuánto tarda un jugador en fabricar Street/Sport/Racing/Prototype y reajustar botín, precios de packs y recompensas si es necesario.
8. Continuar validando instalación/desinstalación de piezas, límite Prototype, assets de transmisión y tablas de sectores de Supervivencia.


## Actualización visual y de garaje — 22/08/2026

La homologación de UI, skins, pantalla principal y colección de cartas está documentada en:

- `docs/continuity/2026-08-22-ui-assets-garage-cards.md`

Ese documento es lectura obligatoria antes de modificar `GarageScene.js`, `carSpecs.js`, skins, logos, cartas o la pantalla principal. Incluye las correspondencias correctas de AVENIR, el sistema de caché versionada y la integración DOM/Phaser de las cartas.


## Arquitectura progresiva de IA de Supervivencia — 22/08/2026

La sustitución del comportamiento de rivales basado en progreso/offset por una conducción con planificación y control físicos está definida en:

- `docs/SURVIVAL_AI_ROADMAP_2026-08-22.md`

Ese documento es lectura obligatoria antes de modificar la conducción, trazadas, tráfico, adelantamientos o humanización de los bots de Supervivencia.

Decisión vigente:

- los parches actuales de suavizado son provisionales;
- la migración se hará por fases y con interruptor `legacy` / `planner_v1`;
- no se tocará la física común BASE 1.0 para compensar fallos de IA;
- la Fase 0 de instrumentación está implementada;
- la Fase 1 calcula una trazada global en modo observación para los 17 circuitos;
- informe de homologación: `docs/SURVIVAL_AI_TRACK_HOMOLOGATION_2026-08-22.md`;
- cada circuito nuevo debe pasar el checklist de ese informe antes de habilitar `planner_v1`;
- el planificador acondiciona discontinuidades únicamente en su geometría derivada y conserva el margen lateral;
- los 17 circuitos pasan validación estructural; Sakhir, Shanghai y Santa Cruz requieren revisión visual prioritaria antes de entregar control a la nueva trayectoria;
- el intento de estabilizar provisionalmente el controlador `legacy` empeoró Santa Cruz y se revirtió completo en `883258c`; no tratarlo como activo;
- la Fase 2 genera perfiles anticipativos de velocidad en observación mediante `src/game/ai/trackSpeedProfilePlanner.js`;
- 17/17 circuitos pasan la validación estructural del perfil; informe en `docs/SURVIVAL_AI_SPEED_PROFILE_VALIDATION_2026-08-22.md`;
- la Fase 3 dispone de un único bot físico experimental activable con `planner_v1`; el modo predeterminado sigue siendo `legacy`;
- usa cuerpo Arcade, dirección, gas y freno, sin teletransporte, tráfico ni adelantamientos;
- tras calibrar anticipación y velocidad por error, 17/17 permanecen dentro del semiancho nominal en simulación;
- Jeddah mejora de 95.6 a 40.1 px, Karting Tenerife de 70.6 a 43.1 px y Santa Cruz de 61.3 a 42.3 px de desviación máxima;
- informe: `docs/SURVIVAL_AI_PHYSICAL_BOT_VALIDATION_2026-08-22.md`;
- no migrar el pelotón ni activar `planner_v1` por defecto hasta superar prueba real en Phaser;
- prueba de sesión: `https://almaprintes.github.io/TopdownCraftrace/?survivalAi=planner_v1&survivalAiDebug=1`;
- el watchdog experimental registra `physical_bot_recovery` al salir o bloquearse; cualquier recuperación invalida la vuelta de homologación;
- con debug activo hay selector táctil `TÚ / CPU1…CPU5`, seguimiento de cámara y etiqueta; CPU1 identifica `BOT FÍSICO`;
- discrepancia corregida: los históricos antiguos no identificaban coche y podían equilibrar Pulse contra otro modelo;
- las vueltas nuevas guardan `carId` y Supervivencia solo usa referencia del coche seleccionado;
- parrilla `legacy` equilibrada por coche y variaciones positivas limitadas para no superar la referencia;
- tras prueba real, el fallback sin histórico se ajustó a 42 % y los multiplicadores quedaron 1.08–1.24 para evitar rivales demasiado lentos;
- CPU1 deriva su velocidad de `targetRate × longitud`, con eficiencia 0.82, y no participa en tráfico legacy;
- observación pendiente: un duelo TÚ/CPU1 duró tres vueltas sin eliminación; ahora las etiquetas muestran V, META y ARMADO y el cierre se evalúa cada frame;
- corrección posterior: CPU1 no era imbatible; su velocidad original era correcta y los lentos eran los legacy;
- se mantiene la conducción lateral nueva de CPU1, se restaura su ritmo con factor 1.16 y se conserva el aumento aplicado a los otros cuatro;
- observación posterior: CPU1 seguía una ese amplia en curvas enlazadas aunque estaba estable en recta;
- el perfil expone curvatura y el controlador amplía lookahead hasta 135 px al detectar chicane para buscar una diagonal;
- validación tras el cambio: 17/17 dentro del corredor; Santa Cruz queda en 35 px máximos sobre 78 px.

- última calibración de CPU1: la excursión de la trazada rápida se limita al 72 % y el factor físico sube de 1.16 a 1.21;
- validación estructural: 17/17 circuitos dentro del corredor; Santa Cruz reduce el offset planificado máximo de 16.8 a 12.1 px y alcanza 1.98 vueltas/60 s;
- pendiente validar en iPhone que se abre menos en las curvas sin convertir la trazada en un carril central.

- una grabación real de 94.7 s confirmó que CPU1 era estable en recta, pero abría demasiado, dibujaba chicanes en S y corregía lentamente en enlazadas;
- se descartó una detección permisiva de maniobras que solo validaba 15/17 circuitos;
- estado vigente: chicane estricta, horizonte adaptado a la curva y volante con variación limitada;
- CPU1 usa factor físico 1.27 y techo experimental 86 %, sin modificar la física ni velocidad máxima del jugador;
- validación final: 17/17 dentro del corredor; Santa Cruz queda en 33.0 px máximos respecto a la línea y 22.9 cambios de signo por vuelta;
- pendiente confirmar movimiento y ritmo con una segunda grabación en iPhone.

- segunda grabación: menor apertura exterior, pero las chicanes cortas no se diagonalizaban y CPU1 seguía lento, normalmente a 50–59 km/h visibles;
- se añade detector de dos lóbulos cortos opuestos y equilibrados; factor físico 1.38 y techo 92 %;
- 17/17 circuitos válidos; Santa Cruz simula 2.00 vueltas/60 s y 20.0 cambios de signo por vuelta;
- el 95 % se descartó porque Shanghai abandonaba el corredor; con 92 % conserva 0.9 px de margen estructural;
- pendiente tercera prueba visual en iPhone.

- decisión aprobada: CPU1 puede comer brevemente un piano; tolerancia estructural de hasta 3 px durante 0.40 s, nunca excursiones prolongadas;
- las chicanes cortas fijan ahora una única salida durante doce muestras para evitar reconstruir la S en el segundo vértice;
- factor físico 1.45 y techo 95 %; 17/17 válidos con el nuevo criterio;
- Shanghai alcanza el caso límite medido: 1.5 px durante 0.30 s;
- no hay fatiga programada: Santa Cruz simula vueltas consecutivas de 29.23 y 29.10 s;
- pendiente validación visual en iPhone.

- cuarta grabación: CPU1 termina la sesión, pero el jugador gana a medio gas; asegura cada curva y circula habitualmente a 40–50 km/h en ellas;
- se añade riesgo calculado: conserva más velocidad solo cuando llega con poco error angular y transversal;
- riesgo máximo 0.35, sin aumentar punta ni introducir errores aleatorios;
- la variante sin confianza se descartó porque Shanghai salía 13 px casi un segundo;
- versión vigente: 17/17 válidos; Santa Cruz simula 27.45 y 27.38 s consecutivos;
- telemetría nueva: cornerRisk, riskConfidence y riskScale.

- referencia humana analizada: AVENIR Gripline, Santa Cruz, 17.301 s; mantiene 58–61 km/h, mínima aproximada 53–55, enlaza curvas como una maniobra y no se recentra tras cada vértice;
- nueva capa experimental `trackManeuverPlanner.js`: suaviza curvatura y agrupa pares próximos, opuestos y equilibrados;
- cada secuencia tiene entrada, identidad, fase, riesgo, salida fija y velocidad común;
- el controlador mantiene el compromiso y no penaliza una separación moderada de la línea dentro del sector;
- validación 17/17; Santa Cruz detecta nueve secuencias, simula 27.83/27.70 s y usa 2.9 px de piano durante 0.28 s;
- no hay coordenadas ni copia literal de Santa Cruz; la solución es genérica;
- pendiente homologación visual en iPhone antes de migrar más bots.

### Último ajuste de CPU1 experimental (2026-08-22)

Se corrigió el contravolante posterior al recorte de una chicane. La causa era el rearme de la misma maniobra cuando su objetivo ya había quedado detrás. El controlador guarda el ID completado hasta salir de la zona, aplica 0,48 s de liberación y limita a 2,2 unidades/s el cambio de signo opuesto. La telemetría publica `maneuverRelease` y `maneuverReleaseSeconds`. Validación sintética: 17/17 circuitos dentro del margen acordado; falta validación visual del usuario en dispositivo.

### CPU1: compromiso interior y descarga sin contravolante (2026-08-22)

Tras la prueba visual del usuario, CPU1 seguía pasando por el centro de las curvas y todavía cruzaba a contravolante después de una comida breve de piano. El modelo admite ahora `apexCommitment`; CPU1 usa 0,20 con `offsetScale: 1`, una demanda interior suavizada y un perfil de curva de `lateralAccel: 1500` / `minCornerSpeed: 125`. Durante la liberación de una maniobra, una orden opuesta con error angular inferior a 0,34 rad se descarga a cero en vez de cruzar de lado. Santa Cruz pasó de 26,350 s a 24,250 s en la simulación del controlador definitivo. Objetivo pendiente: menos de 22,000 s y validación visual en dispositivo.

### Cronometraje provisional de CPU1 en resultados (2026-08-22)

Con `survivalAi=planner_v1`, la capa `RaceSurvivalPolishScene` cronometra ahora las vueltas reales del bot físico CPU1 entre cruces válidos de meta. El informe de sesión añade un bloque aislado con mejor vuelta, media, diferencia respecto a la mejor vuelta humana y lista de vueltas CPU1. Los datos viven solo durante la sesión, no entran en `ttHistory`, récords, recompensas ni estadísticas. Cada vuelta genera además el evento de telemetría `cpu1_lap`. Para retirar la ayuda basta eliminar el bloque provisional y los dos campos de sesión de esa capa.

### Corrección del cronómetro provisional (2026-08-22)

La primera prueba real mostró dos defectos: el panel CPU1 no aparecía por depender de `effective==='planner_v1'` en la fase final del informe, y un cruce humano perdido fusionó dos vueltas en una de 37,037 s (S1 25,570 s), dejando cuatro registros pese a cinco vueltas físicas. El cronómetro usa ahora doble detección: cruce geométrico válido y wrap de progreso `>.78 → <.22`, con bloqueo de 2 s para no duplicar el mismo paso. El respaldo solo cronometra; no altera `completedLaps` ni las eliminaciones. El panel se habilita por existencia real de `_survivalPlannerBot`, incluso si ya fue eliminado.

### Fuente única para vueltas de Supervivencia (2026-08-22)

El respaldo por progreso no resolvió el informe: una nueva sesión terminó 5/5 pero mostró cuatro vueltas, con S2 de V3 inflado a 10,616 s. Se eliminó la duplicidad conceptual. `RaceSurvivalModeScene._registerFinishCross` guarda ahora `_survivalLapTimesMs` en el propio estado del corredor exactamente cuando incrementa `completedLaps`. Jugador y CPU1 consumen esa misma matriz autoritativa en `RaceSurvivalPolishScene`. El informe ya no depende de `ttHistory` para contar vueltas de Supervivencia. Invariante: cada vuelta competitiva aceptada produce exactamente un tiempo.

### Foco inicial del espectador (2026-08-22)

El selector experimental arrancaba enfocado en CPU1. Como el jugador seguía recibiendo control, su coche salía de pantalla y era necesario frenar para pulsar `TÚ`, contaminando el primer tiempo y sectores (observado: vuelta de 23,185 s con S2 de 10,616 s). La cámara inicia ahora siempre en `TÚ`; CPU1 continúa seleccionable manualmente para observarlo.

### CPU1 renderizado desde el informe base (2026-08-22)

Tras confirmar que el contador humano ya presenta 5/5 tiempos coherentes, CPU1 seguía sin aparecer. La inserción posterior de `RaceSurvivalPolishScene` era descartada al reconstruirse la zona de vueltas/sectores. `RaceSurvivalModeScene._showSurvivalSessionInfo` genera ahora el panel CPU1 directamente desde `_survivalPlannerBot._survivalLapTimesMs`, antes de cualquier transformación visual. El panel permanece aunque CPU1 esté inactivo o eliminado y muestra mejor, media, diferencia y vueltas completadas.

### Línea base CPU1 visible en resultado principal (2026-08-22)

Antes de iniciar aprendizaje por imitación se exige medir la línea base real. Como las inserciones en INFO SESIÓN seguían sin sobrevivir a la composición final de sectores, `RaceSurvivalModeScene._showSurvivalResults` muestra ahora un panel CPU1 directamente en la tarjeta principal: mejor, media y V1–V5 completadas desde `_survivalPlannerBot._survivalLapTimesMs`. No requiere abrir el informe y permanece disponible aunque CPU1 haya sido eliminado. No implementar aprendizaje del jugador hasta confirmar estos tiempos en dispositivo.

### Enseñanza en carrera de CPU1 (2026-08-22)

Línea base real confirmada en Santa Cruz antes de aprender: CPU1 V1 20,15 s, V2 20,09 s, V3 20,09 s; mejor 20,09 s, media 20,11 s. Jugador: mejor 17,169 s, media 17,670 s.

Se implementó aprendizaje online provisional en `RaceSurvivalTrafficScene`:

- registra la posición lateral y velocidad humana por muestra del plan global;
- solo acepta muestras en pista, hacia delante y con velocidad útil;
- cierra una lección exclusivamente cuando la misma vuelta autoritativa incrementa `completedLaps`;
- exige al menos 58 % de cobertura y una vuelta entre 10 y 180 s;
- interpola huecos cortos y suaviza tres pasadas para no copiar cabeceos;
- conserva la vuelta humana válida más rápida;
- limita la referencia lateral al 96 % del corredor geométrico;
- no aumenta `maxFwd`: la física y el límite de CPU1 permanecen intactos;
- V1 de CPU1 queda sin aprendizaje; cada plan se activa solo después de que CPU1 cruce meta;
- mezcla progresiva: 18 %, 30 %, 42 % y máximo 55 % según vueltas humanas completadas.

Resultados muestra por vuelta el porcentaje aprendido. Telemetría: `teacher_lap_ready`, `teacher_plan_activated`, `teachingBlend`, `teacherLap`, `teacherBestLapMs` y `teacherCoverage`.

### Enseñanza acelerada tras primera prueba real (2026-08-22)

Primera sesión con enseñanza confirmó funcionamiento pero influencia insuficiente: CPU1 V1 20,12 s al 0 %, V2 19,79 s al 18 % y V3 19,73 s al 30 %. Mejora máxima 0,39 s; eliminado en penúltima ronda. Humano: mejor 17,350 s, media 17,528 s.

Se acelera la progresión sin alterar V1 ni `maxFwd`: objetivos 34 % tras la primera lección, 53 % tras la segunda y máximo 72 %; velocidad de convergencia de mezcla 0,46/s en lugar de 0,22/s. Objetivo de prueba: que V2/V3 se acerquen a 19 s y CPU1 sobreviva hasta quedar segundo.

### Enseñanza adaptativa con rollback (2026-08-22)

Segunda prueba: humano ~17,29 s; CPU1 V1 20,07 s (0 %), V2 19,67 s (34 %), V3 19,77 s (53 %). El 34 % mejoró 0,40 s, pero subir al 53 % devolvió 0,10 s: copiar más no era mejor para el controlador físico.

CPU1 evalúa ahora su propio tiempo al finalizar cada vuelta. V1 establece referencia y habilita 34 %. Una mezcla que mejora se convierte en la nueva mejor y solo permite explorar +8 puntos la vuelta siguiente. Si una mezcla superior pierde más de 50 ms, se rechaza y el objetivo vuelve al mejor porcentaje demostrado. Telemetría nueva: `teaching_improved`, `teaching_rollback`, `teachingBestCpuLapMs`, `teachingBestBlend`, `teachingAdaptiveCap`, `teachingRegressionCount`.

