# DEV 1.2.240 — colisiones autoradas en Karting Américas y Arafo → Los Loros

Fecha: 16/10/2026. Fuente única: `main`. Sin cambios en Google Play, físicas generales, fotografías ni trazados.

## Archivos del propietario
- `karting-americas.environment(1).json`, export versión 7, ID `karting-americas`: **8 líneas de pluma Bézier y 72 nodos** (grosor `halfThickness=9`). Reemplaza la copia existente de `src/game/tracks/library/karting-americas/karting-americas.environment.json`; conserva los ocho IDs, pero sus posiciones y cantidad de nodos sí cambian. No mezclar con copias históricas.
- `rally-arafo-los-loros.environment.json`, export versión 7, ID `rally-arafo-los-loros`: **27 zonas sólidas, 484 vértices**, sin líneas de pluma. Nuevo archivo: `src/game/tracks/library/rally-arafo-los-loros/rally-arafo-los-loros.environment.json`. Polígonos originales preservados sin normalizar, recortar ni cambiar escala. Algunas zonas se extienden unos píxeles fuera de la foto; es geometría autorada, no se modifica automáticamente.
- Ambos incluyen `repositoryPath`, `baseTrack.locked=true`, `environment:[]`, `surfaces:[]`, `linearBarriers:[]` y `materials:{}`. No contienen decoraciones ni barreras visuales, solo colisión invisible.

## Activación en carrera

`src/game/tracks/environmentRegistry.js` descubre automáticamente los archivos `*.environment.json` y carga su contenido por identificador de circuito. `src/game/scenes/raceEnvironmentRuntime.js` usa `sampleCollisionLine` para las líneas, `compileCollisionZone` para las zonas y resuelve contactos del jugador y rivales.

**Corrección imprescindible:** el filtro para escenas `image-native` dejaba sin entorno al rally publicado; la whitelist en `envFor(scene)` ahora incluye expresamente `rally-arafo-los-loros`. No se abren los previews locales ni se cambian los otros circuitos.

Las colisiones respetan coordenadas de mundo de Track Studio (1:1), independientes del escalado visual del coche. El tramo de Arafo sigue siendo `closed:false` (A→B); el circuito de Américas conserva su comportamiento anterior.

## Validación y futuras ediciones
`scripts/owner-environment-import-smoke.mjs` verifica:
- schema, IDs y ubicación de las dos exportaciones;
- 8 líneas y 72 nodos con tangentes válidas de Américas;
- 27 polígonos sólidos y 484 vértices válidos de Arafo; se pueden compilar para el runtime;
- el trazado abierto no queda obstruido en los puntos de centro de carretera muestreados, ni la salida/meta;
- el registro de entorno y su uso real por la escena de carrera, incluyendo player + IA.

El test se ejecuta en `npm run prebuild` y en `.github/workflows/pages.yml`.

Para modificar colisiones en el futuro: abrir el circuito en Environment Studio, corregir allí y **EXPORTAR**. Sustituir únicamente el correspondiente `<track-id>.environment.json` en su carpeta y volver a verificar Build + Deploy. No cambiar los archivos `track.json` ni copiar colisiones entre pistas.

La geometría está verificada por tests, pero el roce físico y la sensación de bordes requieren pruebas manuales en móvil: ambos circuitos, sobre todo las zonas estrechas de Arafo. No generar APK ni subir Google Play automáticamente.
