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
- validación estructural: 15/17 dentro del corredor; Jeddah y Karting Tenerife bloquean la homologación;
- informe: `docs/SURVIVAL_AI_PHYSICAL_BOT_VALIDATION_2026-08-22.md`;
- no migrar el pelotón ni activar `planner_v1` por defecto hasta superar prueba real en Phaser y corregir esos dos circuitos.
