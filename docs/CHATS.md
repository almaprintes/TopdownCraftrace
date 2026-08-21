# Top-Down Race 2 — Estructura de chats y handoff

# SUPERPROMPT ACTUAL — 2026-08-20

Repositorio `almaprintes/TopdownCraftrace` · rama `main`.

## Reglas críticas
- Usar GitHub conectado real.
- Inspeccionar imports y archivos activos antes de editar.
- Cambios pequeños y reversibles.
- Tras modificar, verificar SHA exacto con `fetch_commit` antes de comunicarlo.
- El usuario prueba en iPhone real; no afirmar funcionamiento en dispositivo hasta confirmación.

## BASE 1.0
Física común congelada. No tocar globalmente salvo defecto concreto.
Patrón: `VELOCE Flash`.
Commit base aprobado: `433651cf043c9f2312fdc8cd264948c9645608a7` — `Blend chassis load transitions across brake and throttle`.
La identidad se construye mediante perfiles/overrides individuales.
Override activo: `public/community/car-overrides.json`.

## Filosofía de marcas
- HÉLIX: escuela, accesible y progresiva.
- CROWN: equilibrada, refinada y más prestacional.
- AVENIR: precisión/control; recompensa técnica.
- VELOCE: velocidad a cambio de exigencia creciente.
- FORGE: pesado/lento en asfalto y muy tolerante fuera.

Principio: **mejor coche no significa coche más fácil**.

## Homologación STOCK 1.0 — Karting Tenerife
Contrarreloj, normalmente 5 vueltas, completamente stock.

| # | Coche | Mejor | Punta | Sensación | Estado |
|---|---|---:|---:|---|---|
|1|HÉLIX Spark|50.613|52 km/h|Facilísimo, monótono, llega enseguida a punta|REPETIR STOCK*|
|2|HÉLIX Comet|47.737|56 km/h|Sumamente divertido y accesible|CONGELAR|
|3|HÉLIX Pulse|45.905|59 km/h|Muy rápido/fácil; salida excepcional|VIGILAR|
|4|CROWN Axis|~46.034|—|Algo lento frente a Pulse pero muy fácil|CONGELAR|
|5|CROWN Vector|43.877|62 km/h|Fantástico; permite progresar vuelta a vuelta|CONGELAR|
|6|CROWN Equinox|41.458|65 km/h|Muy potente; rápido con sensación de peligro|CONGELAR|
|7|AVENIR Gripline|44.599|59 km/h|Mucho control y bastante velocidad|CONGELAR|
|8|AVENIR Apex|42.366|62 km/h|Nervioso inicialmente, rápidamente dominable|CONGELAR|
|9|AVENIR Torque|41.008|65 km/h|Sublime; raíles, pianos, salida potentísima|CONGELAR|
|10|VELOCE Flash|41.493|68 km/h|Patrón; difícil, trasera viva, exige freno|PATRÓN / CONGELAR|
|11|VELOCE Surge|39.865|72 km/h|Muy salvaje; orientar antes de abrir gas|VIGILAR|
|12|VELOCE Photon|38.849|80 km/h|Potro indomable; aceleración brutal|REVISAR DIFICULTAD|
|13|FORGE Hammer|52.043|54 km/h|Excesivamente difícil de reorientar|REVISAR|
|14|FORGE Anvil|52.241|54 km/h|Chicanes críticas; gas a impulsos ayuda|REVISAR|
|15|FORGE Colossus|56.607|53 km/h|Aprendible; morro tiembla/pivote muy centrado|REVISAR|

* Spark llevaba Frenos T4. Como apenas frenó, la lectura de carácter sigue siendo útil, pero el crono no es homologación stock estricta.

## Lectura por familias

### HÉLIX
Progresión correcta. Comet especialmente divertido. Pulse quizá demasiado fácil para ser el superior; no tocar todavía. Spark debe repetirse completamente stock.

### CROWN
Familia muy sólida: Axis accesible, Vector progresivo, Equinox potente/peligroso.
Axis recibió únicamente corrección visual `visualScale: 0.92` en commit `efc5b9e917f24d3d93687ce47e2009c9c58c9172`.

### AVENIR
Familia más redonda de la primera homologación.
- Gripline 44.599 / 59: control + velocidad.
- Apex 42.366 / 62: nerviosismo inicial que se aprende rápido.
- Torque 41.008 / 65: precisión brutal, devora pianos, gran salida de curva.

Los tres congelados provisionalmente.

### VELOCE
Flash repetido stock: 41.493 / 68 km/h frente al antiguo 41.751; la mejora del piloto fue solo de unas décimas.

Surge: 39.865 / 72 km/h; 17 detecciones fuera, 31 frenadas, frenada máxima 0.62 s. Muy salvaje pero ofrece enorme recompensa cuando se domina.

Photon: 38.849 / 80 km/h; 26 detecciones fuera, 12.6 s acumulados, 29 frenadas, frenada máxima 1.08 s. Solo una vuelta realmente dominada. Revisar dificultad antes de decidir si suavizar.

No tocar BASE 1.0.

### FORGE — diagnóstico
FORGE necesita revisión, pero **no** debe convertirse en AVENIR pesado.

Hammer:
- Vueltas útiles: 53.974 → 52.051 → 52.043 → 52.409.
- V5 1:12.077 contaminada porque se perdió CP2 y hubo que volver a buscarlo.
- Punta 54 km/h.
- Muy difícil de reorientar pese a poca velocidad.

Anvil:
- Tanda accidental de 4 vueltas: 55.379 → 52.241 → 52.900 → 53.074.
- Punta 54 km/h.
- La segunda curva de las chicanes penaliza muchísimo; casi hay que parar para invertir orientación.
- En curvas normales funciona mejor recuperar gas con pequeños impulsos.

Colossus:
- 1:15.073 → 1:01.061 → 59.054 → 57.152 → 56.607.
- Punta 53 km/h.
- Aprendizaje muy claro y más satisfactorio que Hammer/Anvil.
- Debería sentirse más pesado, pero el morro tiembla demasiado.
- Sensación de pivote excesivamente centrado: la parte trasera parece bailar.
- 71% gas / 28% coasting / 1% freno.

Ventaja FORGE a conservar: enorme tolerancia a césped/terreno y 0 penalización fuera en estas tandas.

Objetivo FORGE 1.1:
- conservar masa, anticipación y dificultad en cambios rápidos;
- conservar ventaja fuera de asfalto;
- reducir pivote central/trasera bailona;
- hacer que la dificultad venga de masa, batalla e inercia, no de sobreviraje extraño;
- hacer Hammer/Anvil más satisfactorios y distinguibles;
- Colossus puede ser el peor en Karting Tenerife, pero debe obedecer previsiblemente cuando se conduce bien.

Antes de cambiar valores: inspeccionar `public/community/car-overrides.json` y el código activo que consume esos parámetros. Ajustes pequeños/reversibles. BASE 1.0 intocable.

## Factory / desequipado y UX pendiente
Gripline tenía accidentalmente `tires_street` T1 y `transmission_prototype` T4.
Wrapper activo: `src/game/scenes/UpgradeWorkshopUnequipScene.js`.
Commit: `fe2a036c45487ee5d939f6564113681c5ce3f7ea` — `Return factory parts to inventory when unequipping`.

El usuario confirmó Gripline con cinco categorías vacías / `SIN EQUIPAR`.

Se descubrió que el inventario visual puede ocultar piezas T4 finales al filtrar según si pueden participar en otra receta. Revisar.

La parte derecha de Fabricación necesita **rediseño UX profundo**:
- botones montados;
- materiales incómodos de desplegar;
- flechas/controles demasiado pequeños;
- flujo crafting → autoequipado → desequipado poco intuitivo;
- inventario que oculta piezas válidas.

No parchear superficialmente: diseñar primero mockup horizontal iPhone y después implementar.

## SIGUIENTE GRAN FASE — CRAFTING Y POTENCIAL MÁXIMO
1. Auditar todas las mejoras reales: Motor, Transmisión, Neumáticos, Frenos y Suspensión; T1→T4; recetas, costes y efectos reales.
2. Determinar cómo debe afectar cada mejora a cada coche/familia.
3. Definir el **máximo potencial** de cada uno de los 15 coches.
4. Evitar que todos los coches maxeados converjan en el mismo supercoche.
5. Permitir potenciar fortalezas, compensar debilidades o habilitar builds sin borrar identidad.
6. Repetir homologación con coches desarrollados/maxeados y comparar stock → máximo.
7. Probar posteriormente en circuitos/superficies diferentes; Karting Tenerife no debe decidir por sí solo el potencial global, especialmente para FORGE.

Principio de diseño: Gripline maxeado debe seguir siendo Gripline; Photon maxeado debe seguir siendo terroríficamente rápido y exigente; Colossus maxeado debe ser una apisonadora eficaz en su terreno, no un deportivo gigante.

## Próximo paso inmediato
Inspeccionar parámetros reales de FORGE en `public/community/car-overrides.json` y su consumo activo antes de proponer FORGE 1.1. Después auditar el árbol completo de crafting/mejoras y definir potencial máximo por coche.

---

# HANDOFF DE SESIÓN — 2026-08-21 — ASSETS, LOBBY DOM Y HÉLIX VORTEX

Estado funcional verificado antes de este bloque documental: `2a5c72aaca01b6db3984bcd3425b6ff26dcbc465` en `main`.

## Objetivo y criterio visual

Durante esta sesión se homogeneizó gran parte del arte de tienda, materiales, piezas y pantalla principal. El criterio acordado es que cada objeto debe reconocerse con claridad a tamaño móvil pequeño, usando siluetas simples, encuadres cerrados, fondos transparentes y WebP optimizados. Para la interfaz principal se abandonaron los textos rasterizados/Phaser en favor de DOM/CSS, porque en iPhone los textos de Phaser no alcanzaban la nitidez exigida.

## Materiales de fabricación

Se regeneraron y conectaron los ocho materiales canónicos de fabricación con arte legible a baja resolución:

- `scrap` / chatarra — `ed7a9f4e7dc81d57be863b9663d10e599633a8a4`.
- `alloy` / aleación — `57ad2a1daf711c08d6f320855199cea5d5f8f8f6`.
- `compound` / compuesto — `79b0805bf3fe41a3d6483dc0613b9c063c73d3df`.
- `disc` / disco metálico — `855273ee9ffad3e8585c343f157e5944a5c1d5e2`.
- `ecu` / electrónica — `21ec7d6ad56e6ad4183147aa158e2807c2ef1c52`.
- `gear` / engranaje — `1e8107899be55efa1591e839b8c0a30593d4a170`.
- `rubber` / goma — `286d3613dc86e283f73282fed3997654003cb684`.
- `spring` / muelle — `a2b86267ab05d3eb0643d345271e519c9ccfea3b`.

El catálogo quedó enlazado a los assets canónicos en `928f144f2219b8c930f86cea74fd0beff59fb896`. Las tarjetas de materiales se hicieron asset-first, ajustadas al contenido y al número de materiales mediante `369a58152faaba2a9f98ce0221d8462107121ed2`, `04a51fd13b465925f07a9303e6dbc4e552fee3e3`, `3e2e3eff7f0c7c461a7dc2f0ca4dd36c54362803`, `b8357581ac761f9c0c5edcce07ca6c379515b399` y `b850b5343ed19bca8915dce0da02a14258b4a184`.

## Familias de piezas y tiers

Las cinco familias usan una imagen coherente dentro de cada familia y calidad visual ascendente por tier:

- T1: azul eléctrico.
- T2: verde chillón.
- T3: morado épico.
- T4: dorado legendario.

Familias regeneradas:

- Frenos: `54b83ec9d06e781fec37059a2b23fffaedbec653`.
- Motor: `bc2a9869795b82e6539dad6ef2c278494ca80a47`.
- Suspensión: `51470d975e37897979bbcd3944e8ef19cc42283c`.
- Neumáticos: `9dfa64383e7f080cb5f657b7f497606377805c77`.
- Transmisión: `5cac35c9a49f08944ad4cbb210d7073587f13a85`.

## Tienda: monedas y recompensas

Se crearon tres assets basados en la moneda oficial del juego:

- 2.500 monedas: montón — `public/assets/store/coins_2500.webp`.
- 7.500 monedas: bolsa — `public/assets/store/coins_7500.webp`.
- 20.000 monedas: cofre rebosante — `public/assets/store/coins_20000.webp`.

Integración: `c8534b648944d8c8f725aa70ac966e9803b24193`.

Se sustituyeron también los iconos genéricos de las tarjetas de recompensas:

- Vídeo recompensado: `public/assets/store/rewarded_video.webp`.
- Regalo diario: `public/assets/store/daily_gift.webp`.

Integración: `0b935e83f1a249e4f82456d69f56f364f4eb32af`.

## Pantalla principal: migración a DOM nítido

La pantalla inicial fue reconstruida como shell DOM/CSS superpuesta a Phaser para que textos, botones y paneles se rendericen nítidos en iPhone. Archivos principales:

- `src/game/ui/LobbyDomUi.js`.
- `src/game/ui/lobby-dom.css`.
- `src/game/scenes/MenuDomUiScene.js`.

Secuencia principal:

- Shell DOM, iconos premium, fondo y plataforma: `f240e71bab9b886ec14a4e49505fa69d239aa7c3`.
- Tarjetas de evento/coche/circuito migradas a DOM: `a1eeea72d7124e7d1a04e8084b742523f1a7982e`.
- Reencaje de tarjetas alrededor del coche y CTA: `4cfdb364b1c7b570904b757a0bfce5f69a62ec76`.
- La plataforma se separó del detector de textura del coche y se colocó entre fondo y vehículo: `ebf294769513a927a1011b54b536ce1b8af3406c`, `66dba0e1a45f3f9ff0970ae2897538025bc2de0f`.
- Recodificación WebP de plataforma para iOS: `ffe4f07bc09ba8c73a365a1085eee1318da55c2c`.

Resultado confirmado visualmente: plataforma circular visible bajo el coche, CTA verde en el centro, paneles laterales y botones inferiores consistentes.

## Coches: doble nivel de calidad

Se decidió mantener dos exportaciones distintas por coche:

- Lobby: render superior de alta calidad en `public/assets/cars/lobby/`.
- Carrera: skin ligera `256×512` en `public/assets/skins/`.

Los 15 renders de lobby se incorporaron en `296a52bdd93634b98ad2b5692bce7b0ba45f577e`. Crown Vector sirvió como prueba de skin de carrera mayor en `6c5bdc1c0a38b8f0d43f78a4d7a81a307f6db117`; después se sustituyeron las otras 14 en `7dca9b02bcde6636a16a98bfc07270d8b41a3319`.

Correcciones posteriores:

- Axis y Hammer estaban intercambiados: `fa6213e6c196680eaea16a2d9f55a0e3b89de8bc`.
- Aumento progresivo del tamaño de los coches en lobby: `eecf74a2be540c56f06f1eb22e0e25b2716f166d`, `0e8f8f4a82548a871af5a72e0d7d1315dc2ce09f`.
- Panel de información del coche reducido en altura para no tapar la carrocería: incluido en `0e8f8f4a82548a871af5a72e0d7d1315dc2ce09f`.
- HÉLIX Pulse y Comet apuntaban hacia abajo en sus skins originales y corrían de espaldas; se rotaron para carrera en `bf82dc7ff8bdfe3641126785653dbfb7b1444750`.

## Logos de marcas en el panel del coche

Se eliminaron las cajas de texto improvisadas y se usan logos oficiales:

- Primera integración: `34e2ba1f0881bbb8aed143921c48306f4fee4949`.
- Avenir y HÉLIX usan emblemas compactos proporcionados por el usuario.
- Veloce recibió un emblema compacto nuevo: se eliminó el wordmark, se cerró el escudo simétricamente y se conservó la V amarilla con acentos italianos.
- Assets: `public/assets/logos/logo_avenir_compact.webp`, `logo_helix_compact.webp`, `logo_veloce_compact.webp`.
- Integración compacta: `f6de4407c761928a5a8f82ab83bfec98f06711d2`.
- Crown y Forge se elevaron 5 px. Crown quedó finalmente en `46×31 px`: `16ff143d1aef79dbc567dff460871c7c697598db`, `ef94ee43a0698a3a8bf8cdcad8e7e9a55da3b027`.

## Logo oficial del juego y acceso oculto a Admin Hub

El escudo de las cartas de coche se sustituyó por el logo oficial de la intro (`public/assets/logo.webp`) en la esquina superior izquierda:

- Sustitución: `b8f86b30a51dc8838b4bcdd69cc963b85d4f8758`.
- Tamaño móvil protegido para que no baje a 42 px: `15fc881a85ef48df60a0a2ab40d4d4643038b15e`.
- En iOS, la pulsación larga abría el menú contextual de imagen. Se bloquearon selección, arrastre, `contextmenu` y `-webkit-touch-callout`: `c536f383083cbf2a0fbdf2a4c6ea9dd9e286128c`.

No se eliminó el acceso a Admin Hub. Sigue siendo pulsación mantenida durante 700 ms sobre el logo; activa `tdr2:admin` y abre la escena `admin-hub`.

## Persistencia del scroll del garaje

Al volver al garaje, la columna izquierda regresaba al primer coche. Ahora, tras reconstrucción o resize, el scroll centra el coche seleccionado persistido en `tdr2:carId`.

Commit: `6f417888761e92733c324e3fcb2f3a3fc2b94452`.

## Nuevo coche #016 — HÉLIX Vortex

Se decidió integrar el diseño inspirado en el Nissan Juke personal del usuario dentro de una marca existente para no crear una sexta familia vacía. Nombre definitivo de trabajo: **HÉLIX Vortex**.

Se eliminaron marcas Nissan en la vista generada de taller y se usó el emblema compacto HÉLIX. Se conservaron como invariantes:

- crossover compacto de formas redondeadas;
- pintura azul eléctrico;
- techo negro;
- dos franjas blancas longitudinales;
- ópticas superiores estrechas y faros bajos redondos.

Assets finales:

- `public/assets/cars/workshop/helix_vortex.webp` — tres cuartos frontal, `1536×1024`.
- `public/assets/cars/lobby/helix_vortex.webp` — vista superior, `512×1024`.
- `public/assets/skins/skin_helix_vortex.webp` — carrera, `256×512`; rotada 180° para apuntar hacia delante.
- `public/assets/cars/runtime/card_helix_vortex_raro_016.webp` — tarjeta oficial, `512×768`.

Arte inicial: `c37fe3b38db0e9fbca761378bd8a19bb0f21cfc5`.
Alta completa en catálogo y precarga: `2a5c72aaca01b6db3984bcd3425b6ff26dcbc465`.

Ficha provisional:

| Campo | Valor |
|---|---|
| ID | `helix_vortex` |
| Colección | `#016` |
| Rareza | Raro |
| Categoría | All-Rounder |
| Rol | Crossover ágil |
| País | España |
| Visual scale | 1.10 |
| VEL / ACC / GIR / EST / FRN | 61 / 76 / 68 / 78 / 70 |
| maxFwd | 555.6 |
| accel | 806.9 |
| brakeForce | 1111.2 |
| turnRate / turnMin | 3.87 / 0.28 |
| grip coast / drive / brake | 0.29 / 0.10 / 0.20 |

La configuración del Vortex es deliberadamente **provisional**. BASE 1.0 no se tocó. El coche debe homologarse stock en Karting Tenerife, cinco vueltas, igual que los demás. Objetivo de carácter: más aceleración y estabilidad que Pulse, sin superar su punta; fácil de colocar, con masa de crossover perceptible y sin convertirse en otro AVENIR.

## Estado y próximos pasos exactos

1. Confirmar en iPhone que la tarjeta #016 aparece en el garaje y que el scroll la centra correctamente.
2. Confirmar las tres presentaciones visuales: tarjeta/garaje, lobby sobre plataforma y skin en carrera.
3. Hacer tanda stock de cinco vueltas en Karting Tenerife y registrar mejor vuelta, punta, salidas, frenadas y sensaciones.
4. Ajustar solo el spec individual del Vortex si la telemetría contradice el carácter objetivo. BASE 1.0 permanece congelada.
5. Decidir su método de desbloqueo. Actualmente `GarageScene` enumera todos los coches de `CAR_SPECS`; por tanto el Vortex aparece disponible inmediatamente y no existe todavía una barrera específica de propiedad/desbloqueo.
6. Mantener pendiente el rediseño profundo de Factory/crafting y la revisión FORGE 1.1 ya documentados en el bloque anterior.
