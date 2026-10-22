# Top Down RACE — DEV 1.3.2 · Fantasmas propios y Santa Cruz

Fecha: 22/10/2026 · Rama única: main · Google Play pública 1.2.335/versionCode 10 (confirmada visualmente por el propietario; **NO cambiar ni preparar Android**).

## Incidencia reportada

- Santa Cruz mostraba errores de fantasma similares a los producidos cuando Atlántico cambió de geometría.
- En Atlántico y Santa Cruz, al entrar a modo fantasma no aparecía un fantasma local nuevo, **pero Race Control sí tenía replays grabadas que se podían reproducir/usar allí**.
- Regla del propietario: competir contra el **récord personal del propio dispositivo automáticamente**, sin descargarlo primero desde Race Control y sin anuncios para el fantasma propio. La repetición es una trayectoria temporal de muestras de posición, **no un vídeo MP4 pregrabado**.

## Causas verificadas en fuente anterior

1. Race Control guardaba replays locales entre las mejores vueltas bajo `tdr2:topReplay:<trackId>:<lapId>`. Ghost buscaba solo `tdr2:ghostPb:<trackId>` o `tdr2:ghostGeometry:<trackId>:<geo1...>` y no resolvía automáticamente la repetición archivada por Race Control. El PB mostrado podía existir sin una repetición accesible.
2. El modo Fantasma no garantizaba el guardado de la repetición canónica en el mismo momento en que la capa Top10 archivaba el récord. En retos VS online, Ghost había omitido explícitamente el guardado local para no sustituir al rival; el archivador Top10 seguía disponible.
3. La validez geométrica `ghostTrackCompatibility.js` rechazaba Atlántico antiguo, pero no Santa Cruz anterior al rediseño: una repetición con coordenadas obsoletas podía aparecer fuera de pista.
4. `RaceReplayRealSectorsScene` guardaba los sectores enriquecidos siempre en `this._ghostStorageKey` aunque el replay activo proviniese de otra clave de almacenamiento.

## Cambios DEV 1.3.2

- `src/game/tracks/ghostReplayRecovery.js`: buscar en replays **locales** de Race Control a partir de las claves de `localRaceRecords` y validar pista, muestras, duración y geometría. Primero PB exacto (tiempo igual al récord oficial), si no existe, vuelta compatible más rápida como `VUELTA ACTUAL`. No requiere consulta Supabase, descarga ni anuncio.
- `RaceStaticGhostStatusScene.js`: al entrar en Ghost, leer el replay PB o de geometría correspondiente, recuperar el mejor de Race Control si existe; copiar una vuelta actual bajo clave de geometría **sin tocar el PB antiguo**. Un rival online explícito tiene prioridad y nunca se reemplaza silenciosamente.
- `persistOfficialPersonalBestReplay` guarda un PB nuevo automáticamente en `tdr2:ghostPb:<trackId>` desde la repetición que `RaceTop10ReplayScene.js` acaba de archivar. La referencia del `ttBest` local se actualiza solo cuando el tiempo coincide exactamente, manteniendo tiempos y progresión intactos.
- `ghostTrackCompatibility.js`: Santa Cruz normal/inverso aplica distancia a carretera autorada para descartar grabaciones antiguas sin revisión geométrica que no encajan. Atlántico 70 % continúa con su regla específica 100 % vs 70 %.
- `RaceReplayRealSectorsScene.js`: solo reescribe metadatos de sectores en la clave de replay PB o geometría **que ya contiene esa misma grabación**; nunca contamina replays top10 ajenos ni rivales online.
- `scripts/ghost-local-pb-recovery-smoke.mjs` valida Atlántico y Santa Cruz normal/inverso, recuperación sin red y sin transferir tiempos, guardado PB exacto local, separación entre sentidos, rechazo de trazado viejo y protección de claves/sectores; añadido a Pages CI.

## Límites y comprobaciones necesarias

- Ningún cliente puede fabricar una grabación histórica de una vuelta cuyo fichero/muestras ya no existen en el dispositivo. Si el PB solo vive en Supabase en otra instalación, hace falta recuperarlo una vez o conducir una vuelta nueva; el cambio evita **esa dependencia en los próximos récords guardados localmente**.
- Replays locales Race Control **Top10** deben continuar visibles. PB anterior jamás se sustituye por un tiempo peor solo para obtener un fantasma visual; se muestra `VUELTA ACTUAL` si hay una repetición compatible más lenta.
- Validación física pendiente en la DEV 1.3.2: Santa Cruz e inverso y Atlántico e inverso; completar un PB limpio nuevo, salir/reentrar Ghost sin Race Control, comprobar rival propio; repetir con PB histórico obsoleto, marca actual más lenta, reto VS online y después reiniciar app. Verificar conservación de récords y replays en Race Control.
- CI/smokes son evidencia sintética, **no** de experiencia de dispositivo. No generar APK/AAB ni publicar en Play por esta iteración.
