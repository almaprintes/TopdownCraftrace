# 7 PICOS — fuente oficial actual

La fuente activa es `7-picos.tdrtrack`, sustituida por el propietario el 24/10/2026.
SHA-256: `380fb298bd42ae035599894f3ad75a3393421709881e8b3133223a81a26bfc80`.

Contiene foto WebP 4344×3258, 32 nodos Bézier, 898 muestras de trazado, meta y dos checkpoints.
El instalador `scripts/install-siete-picos-source.mjs` genera `../track.json` 1:1,
la foto original `public/assets/tracks/siete-picos/7-picos.webp`,
seis mosaicos `photo-{fila}-{columna}.webp` de 1448×1629,
y seis mosaicos iOS compactos en el prebuild.

El proyecto oficial `../siete-picos.environment.json` **no contiene elementos
del circuito anterior**: todas las barreras, decoraciones y Copas deben volver a
dibujarse desde Environment Studio.

Abrir Admin Hub → Environment Builder → ABRIR → 7 PICOS.
CARGAR recupera borradores locales: NO cargar JSON de colisiones antiguo.
El circuito se puede probar en DEV, pero sigue oculto de Google Play.
