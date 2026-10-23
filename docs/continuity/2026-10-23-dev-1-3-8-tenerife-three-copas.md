# DEV 1.3.8 — Karting Tenerife: tres copas dibujadas por el propietario

Fecha 23/10/2026 · main · DEV PWA exclusivamente.

## Entrega y alcance
El propietario adjuntó `karting-tenerife.environment(10).json` exportado desde Environment Studio (esquema v8, `trackId: karting-tenerife`, baseTrack.name: «KARTING TENERIFE INVERSO»). Siguiendo la iteración anterior, se interpretó como envío de máscaras «Copas» y se incorporaron **solo esas máscaras** al environment físico `karting-tenerife`, reutilizado por Normal e Inverso. Se mantiene el nombre «Copas»; no hay migración ni renombre a overheadZones.

## Datos instalados
- `src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json`: nuevo campo `canopyZones` con **3 polígonos**, **208 puntos** en total, preservando números decimales exactos del export original:
  - `canopy-1792786107548-0`: 78 nodos
  - `canopy-1792786209564-1`: 94 nodos
  - `canopy-1792786251490-2`: 36 nodos
- Las tres tienen `kind: photo-canopy`, `opacity: 0.93`, coordenadas dentro de mundo de Tenerife (`2813 × 2602`), área >100 y sin autointersecciones.
- No se modificaron las cinco líneas de barreras Bézier originales ([2,2,4,5,3] nodos), ni ninguna de las 17 zonas sólidas de colisión, línea de meta, fotografía, publicidad ni otros campos existentes del environment. Se mantiene `version: 7` del JSON de repositorio. El archivo adjunto usa v8 de exportación Studio, pero **no se sustituyó el documento completo** para evitar cambios ajenos a las máscaras.
- `EnvironmentBuilderCanopyOcclusionScene.js`: el botón anterior específico «Cargar 8 copas Canarias» pasa a «**Cargar copas del circuito**», que carga el array `canopyZones` oficial del circuito seleccionado (Tenerife 3, Canarias 8), avisa antes de reemplazar copas locales y no toca ninguna colisión. Resto de UI sigue llamándose «Copas».
- `scripts/environment-canopy-occlusion-smoke.mjs`: test comprueba tres copas, 208 puntos, versión, escala y geometría, conservación de colisiones, igualdad de pista física inversa y hash SHA256 exacto de `JSON.stringify(canopyZones)`: `c885e69bbb936a5601471d202b524e93739032548622aeb64eb8b56ed1e12aa3`. Si se autoriza un cambio futuro de estas copas, actualizar el test en la misma iteración.
- Versión web DEV: 1.3.8. Sin APK/AAB ni actualización Google Play, Supabase, récords o fantasmas.

## Por probar
El propietario debe comprobar en iPhone/Android que las ramas se ven **por delante** del coche solo cuando la fotografía lo justifique, tanto Tenerife Normal como Inverso, y medir si hay impacto en FPS, memoria y temperatura. Las pruebas automatizadas son técnicas/sintéticas; no sustituyen una carrera real.
