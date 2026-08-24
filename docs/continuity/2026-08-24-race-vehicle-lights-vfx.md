# Continuidad — VFX de carrera: luces y estela de velocidad

Fecha: 2026-08-24
Repositorio: `almaprintes/TopdownCraftrace`
Rama: `main`

## Estado al cerrar este bloque

Archivo activo de esta capa visual:

- `src/game/scenes/RaceBrakeLightsSpeedTrailScene.js`

Commit de referencia al documentar:

- `6a89393c461cfc880f30524d4d962b004a36c471` — `tune: add compact headlight cores with soft halo`

Esta capa es una gratificación visual para dispositivos capaces. En `window.__tdrIosSafeMode === true` no se crean ni actualizan estas luces/estelas, para no penalizar teléfonos en modo seguro.

## Luces traseras — diseño aprobado

La solución anterior con círculos rojos se descartó porque se veía artificial, podía parecer separada del coche y no encajaba con las ópticas de la mayoría de skins.

Diseño actual aprobado por el usuario:

- dos pilotos rojos triangulares;
- anclados al `carRig`, por lo que deben permanecer pegados al coche y no ondular respecto a él con el zoom/cámara;
- colocados ligeramente más arriba que la primera iteración y un poco más abiertos lateralmente;
- luz de posición casi apagada: rojo oscuro y transparencia moderada;
- al frenar pasan a rojo puro/intenso;
- durante frenada se añade un halo triangular tenue;
- no modificar esta colocación sin una nueva prueba visual, porque el usuario confirmó explícitamente que las rojas le gustan mucho.

Parámetros actuales relevantes:

- posición longitudinal: `edgeY = h * 0.385`;
- apertura: `halfSpread = max(4.8, w * 0.285)`;
- posición: `0x7b0808`, alpha `0.52`;
- frenada: `0xff0000`, alpha `1.0`.

## Coches cuya imagen muestra el frontal

Hay skins que visualmente están orientadas al revés respecto a las demás y muestran el morro. En ellas NO deben dibujarse pilotos traseros rojos.

Lista activa:

- `helix_comet`
- `helix_pulse`
- `helix_vortex`

Para estos coches se usan dos ópticas delanteras blancas redondas situadas en el morro.

## Faros blancos — última iteración

La primera versión de los faros blancos eran dos círculos simples y grandes; el usuario no quedó convencido.

Dirección solicitada:

- círculo central más pequeño;
- halo transparente alrededor;
- sensación de que la luz encandila ligeramente;
- deben estar DELANTE del coche, nunca detrás;
- deben ser redondos, no triangulares.

Implementación actual en `6a89393...`:

- núcleo blanco compacto (`coreR` entre 1.25 y 2.05 aprox. según ancho visual);
- halo interior `1.9 × coreR`, blanco azulado, alpha `0.15`;
- halo exterior `3.0 × coreR`, azul/blanco muy tenue, alpha `0.07`;
- núcleo alpha `0.96`;
- posición longitudinal `frontY = -h * 0.405`;
- apertura lateral `halfSpread = max(4.5, w * 0.255)`.

IMPORTANTE: esta última versión de los faros blancos está implementada pero todavía debe considerarse **pendiente de validación visual final del usuario en dispositivo**. No confundir con las luces rojas, que sí están aprobadas.

## Estela de velocidad

La misma capa mantiene una estela visual muy breve cuando el coche circula a gran velocidad. El objetivo es transmitir velocidad sin dejar fantasmas persistentes ni ensuciar la pantalla.

Valores actuales:

- velocidad mínima: `TRAIL_MIN_SPEED = 520`;
- muestreo: `85 ms`;
- vida: `145 ms`;
- máximo simultáneo: `5` fantasmas;
- alpha inicial: `0.10`;
- ligero tinte frío `0xdcecff`;
- crecimiento durante fade: `1.015`;
- destrucción automática al terminar el tween.

La estela se omite completamente en modo seguro iOS.

## Reglas para próximas iteraciones

1. No sustituir las luces por imágenes generadas: esta solución está dibujada en runtime con `Phaser.GameObjects.Graphics`.
2. No tocar las luces rojas salvo petición explícita: diseño y colocación están aprobados.
3. Ajustar los faros blancos solo tras ver captura/prueba del estado `6a89393...`.
4. Mantener todos estos VFX fuera del modo seguro.
5. Si aparecen más coches con sprite frontal, añadirlos de forma explícita a `FRONT_LIGHT_CARS`; no inferir orientación de manera frágil durante cada frame.
6. Cualquier ajuste debe permanecer anclado al `carRig`, evitando efectos que se desplacen respecto a la carrocería al variar zoom o cámara.
