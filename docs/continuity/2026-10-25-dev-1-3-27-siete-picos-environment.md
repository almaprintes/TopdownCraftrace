# DEV 1.3.27 — Environment Studio · 7 Picos nuevo

Fecha: 25/10/2026. Repo: almaprintes/TopdownCraftrace, rama main.
Fuente entregada: `siete-picos.environment(1).json` (JSON v8, SHA-256 del archivo de usuario `3660412d164be33bc6623b75693f3cb82c524660a60525c1092504481821e591`).

La fotografía WebP y el trazado 4344×3258 de 7 Picos permanecen EXACTAMENTE como DEV 1.3.26. El usuario creó un nuevo entorno sobre esta fotografía: **2 barreras Bézier** con 45 y 42 nodos (87 en total), ambas `type=collision` y `halfThickness=9`, con los puntos y controles `in/out` sin modificaciones. Una decoración `finish_line_checkered` en x=2057.21, y=2892.54, ángulo 1.55388, displayWidth 108.41, z=12. No hay otras decoraciones, superficies, barreras lineales, zonas ni Copas.

Se ha instalado el JSON v8 como proyecto oficial `src/game/tracks/library/siete-picos/siete-picos.environment.json`, añadiendo únicamente `coordinateSpace=race-world` para explicitar coordenadas ya 1:1. Se mantiene `repositoryPath`, `baseTrack`, identificadores y todos los datos. El ejecutable debe cargar este entorno desde el registro del circuito y las colisiones sin escalar.
`scripts/siete-picos-replacement-smoke.mjs` verifica nodos, asas, límites de lienzo, meta y ausencia de geometría antigua. Prueba en prebuild.
No modificar otros circuitos, físicas, APP pública o ranking. No generar APK ni AAB. En DEV: Admin Hub → Environment Builder → ABRIR → 7 PICOS (NO CARGAR un borrador anterior). Comprobar colisiones y meta en carrera antes de considerarlo terminado.
