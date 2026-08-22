# Continuidad — UI, assets, garaje y cartas (22/08/2026)

Este documento registra el trabajo visual y técnico realizado durante la sesión larga del 21–22 de agosto de 2026. Debe leerse junto con `PROJECT_HANDOFF.md` y el código actual de `main` antes de continuar.

## Fuente de verdad

- Repositorio: `almaprintes/TopdownCraftrace`.
- Rama operativa actual: `main`.
- No asumir rutas, nombres o escalas de memoria: comprobar siempre el código y los assets publicados.
- No declarar una tarea terminada sin commit confirmado y, cuando corresponda, validación visual en iPhone.

## Dirección visual consolidada

- Interfaz arcade premium, oscura, mecánica y tecnológica.
- Azul eléctrico/cian para navegación y garaje, verde para fábrica/acción, dorado para circuitos y elementos legendarios.
- Los textos importantes deben ser DOM/CSS o renderizarse de forma que permanezcan nítidos; evitar transformaciones continuas de Phaser sobre texto o cartas.
- Los assets protagonistas deben ocupar el área disponible y leerse claramente a tamaño móvil.
- Mantener coherencia de marcos, chaflanes, líneas finas y superficies de carbono/metal.

## Materiales y piezas

Se regeneraron o sustituyeron assets de materiales con objetos reconocibles a baja resolución: aleación, chatarra, compuesto, disco metálico, electrónica, engranaje, goma y muelle.

Para piezas existen cinco familias y cuatro tiers. Una familia conserva el mismo objeto y aumenta su calidad visual por tier:

- Tier I: azul eléctrico.
- Tier II: verde chillón.
- Tier III: morado épico.
- Tier IV: dorado legendario.

Familias trabajadas/referenciadas: frenos, motor, suspensión, neumáticos y transmisión. Mantener esta gramática en futuras regeneraciones.

## Tienda

La tienda es un catálogo horizontal único: `MATERIALES → MONEDAS → RECOMPENSAS`. Los botones superiores son anclas, no pantallas separadas.

Assets de packs de moneda definidos usando la moneda oficial:

- 2.500: montón de monedas.
- 7.500: bolsa de monedas.
- 20.000: cofre rebosante de monedas.

También se adecuaron las tarjetas de vídeo recompensado y regalo diario. Consultar `PROJECT_HANDOFF.md` para economía, importes y cooldown.

## Pantalla principal

La pantalla inicial se homogeneizó con cabecera oscura, navegación superior y tres bloques principales:

- panel de evento a la izquierda;
- coche y plataforma central;
- circuito seleccionado a la derecha;
- navegación inferior Garaje / Fábrica / Circuitos;
- botón central `ARRANCAR MOTOR`.

Decisiones importantes:

- La plataforma circular bajo el coche debe verse completa y por debajo de la skin.
- El panel de información del coche se redujo en altura para no tapar la carrocería.
- Las skins de menú se muestran mayores y ligeramente desplazadas hacia abajo.
- Las skins de carrera están optimizadas por separado; las de menú pueden usar una fuente más nítida/pesada.
- `Pulse` y `Comet` requieren rotación de 180° en carrera porque sus PNG originales apuntan en dirección contraria.
- Se corrigió una asignación cruzada previa entre Axis y Hummer; no volver a inferir identidades por color.
- La zona superior izquierda usa el logo real del juego y conserva el acceso oculto/administrativo al Admin Hub.
- El logo no debe poder seleccionarse, arrastrarse ni abrir el menú contextual de imagen en iOS.

## Marcas y logos

- En la ficha de coche se usan logos reales, no cajas tipográficas improvisadas.
- CROWN y FORGE usan sus emblemas oficiales con ajustes verticales específicos.
- HÉLIX, AVENIR y VELOCE usan versiones compactas sin texto cuando el espacio es reducido.
- El logo compacto de VELOCE se construyó cerrando simétricamente el escudo y eliminando el wordmark largo.
- No cambiar escalas/offsets de logos sin comprobar las cinco marcas en el dispositivo real.

## Garaje: comportamiento y nitidez

- La columna izquierda centra el coche seleccionado y conserva la selección mediante `localStorage` (`tdr2:carId`).
- La carta grande del garaje dejó de animarse con zoom, porque el reescalado continuo de Phaser producía borrosidad.
- La carta protagonista se presenta como imagen DOM a resolución nativa; Phaser mantiene la geometría y las miniaturas.
- Las cartas especiales pueden recibir una capa holográfica independiente sin transformar la imagen base.
- HÉLIX Vortex conserva explícitamente `cardEffect: 'holographic'`.
- El efecto holográfico automático también se aplica a rarezas épicas/legendarias según la lógica actual.

Archivo principal: `src/game/scenes/GarageScene.js`.

### Carga de cartas y caché

Las rutas siguen este patrón:

`public/assets/cars/runtime/card_<carId>_<rareza-normalizada>_<coleccion-3-dígitos>.webp`

Ejemplo:

`card_avenir_gripline_poco_comun_007.webp`

Reglas:

- Al reemplazar una carta, incrementar `cardAssetVersion` en `src/game/cars/carSpecs.js`.
- La clave interna de Phaser también está versionada: `card_<carId>_v<version>`.
- La imagen DOM central reutiliza la URL ya resuelta y decodificada por Phaser. No reconstruir una ruta DOM independiente usando solamente `document.baseURI`.
- Si la capa DOM falla, debe mostrarse la textura Phaser como respaldo, nunca un interrogante o el texto alternativo roto.

Commits de esta corrección:

- `12cd7311c7397fac0afffaf7e3ab00c5fd460382` — claves de textura Phaser versionadas.
- `b8911e3299a1924c591aec5cf28c26b9e6074828` — la capa DOM reutiliza la URL resuelta por Phaser y tiene fallback.

## HÉLIX Vortex

Se incorporó como coche oficial #016:

- marca HÉLIX;
- modelo Vortex;
- España;
- All-Rounder;
- rol Crossover ágil;
- rareza Raro;
- carta holográfica;
- skin visible en fábrica, garaje, menú y carrera.

La carta Vortex 1024×1536 es la referencia oficial del nuevo formato frontal.

## Colección de cartas homologadas

Se homologaron las 15 cartas anteriores al estilo de Vortex:

- 1024×1536;
- WebP de alta calidad;
- marco metálico común;
- cabecera de carbono;
- cuerpo oscuro/asfalto;
- cinco paneles VEL/ACC/GIR/EST/FRN;
- coche grande a la derecha;
- lema y placa inferior;
- valores tomados de `CAR_SPECS`, no de textos antiguos incrustados.

Commit del lote:

- `a78790f8f3323b52ca5bebd497fc02ccfa6b5ccd` — colección frontal homologada y `cardAssetVersion: 3`.

### Correspondencias de vehículos que no deben volver a cruzarse

AVENIR:

- `avenir_gripline` #007 → coche blanco tricolor.
- `avenir_apex` #008 → coche azul.
- `avenir_torque` #009 → coche negro con detalles naranjas.

Estas tres cartas se corrigieron y usan `cardAssetVersion: 4`.

Commit:

- `0f9ccf799cbb98efb6cdf3d9f2ffe4bdcad30fd4` — corrección de correspondencias AVENIR.

FORGE:

- Hammer → SUV verde.
- Anvil → monster truck azul ancho.
- Colossus → vehículo largo/pesado con carrocería blanca/negra y marca FORGE.

## Assets fuente y calidad

- Para cartas y menú se deben conservar PNG originales con transparencia cuando existan.
- No extraer coches blancos mediante eliminación automática de fondo blanco: perfora la pintura y crea transparencias falsas.
- WebP de juego y WebP de UI pueden tener resoluciones/calidades distintas.
- La colección actual de cartas pesa aproximadamente 460–520 KB por frontal a 1024×1536, calidad WebP cercana a 92.
- Las skins de carrera usan versiones optimizadas más pequeñas; las de menú priorizan nitidez.

## Pendiente inmediato

1. Validar en iPhone que las 16 cartas se muestran en miniatura y en el hero central sin interrogantes.
2. Recibir e integrar la trasera homologada que aportará el usuario.
3. Definir si la trasera se usa solo como asset coleccionable o también en una animación de giro.
4. Si se anima una carta, mantener la imagen base sin escalado continuo; animar una capa o una rotación muy pequeña y comprobar nitidez.
5. No rehacer Vortex ni su efecto holográfico: están aprobados.

## Commits recientes de referencia

- `4ac8b77c11043fb5834b24430f0a54c387c1f299` — carta Vortex HQ y caché.
- `e4049c70a13f7debe32fcfb7f27d7d9c006b7091` — carta hero del garaje fuera del canvas Phaser.
- `a78790f8f3323b52ca5bebd497fc02ccfa6b5ccd` — 15 cartas homologadas.
- `12cd7311c7397fac0afffaf7e3ab00c5fd460382` — claves Phaser versionadas.
- `b8911e3299a1924c591aec5cf28c26b9e6074828` — URL DOM resuelta desde Phaser y fallback.
- `0f9ccf799cbb98efb6cdf3d9f2ffe4bdcad30fd4` — AVENIR corregidos.

## Regla para el siguiente chat

Antes de editar:

1. Leer `PROJECT_HANDOFF.md`.
2. Leer este documento completo.
3. Inspeccionar `src/game/scenes/GarageScene.js` y `src/game/cars/carSpecs.js` en `main`.
4. Verificar el SHA actual de `main`.
5. Resumir lo entendido y señalar cualquier discrepancia antes de modificar archivos.

