# DEV 1.3.4 — Reinicio archivado de récords locales por cambio de trazado

Fecha 2026-10-23 · main-only · alcance web DEV; sin APK, AAB, Supabase, ni lanzamiento público Android.

## Autorización del propietario

El propietario confirmó explícitamente «Sí» a la siguiente operación:
«¿Reiniciamos únicamente los récords locales de Santa Cruz y Circuito Atlántico, tanto Normal como Inverso, conservando una copia histórica y dejando intactas todas las clasificaciones online?»

Afecta exclusivamente a cuatro identificadores:
- `santa-cruz`
- `santa-cruz-inverso`
- `circuito-atlantico`
- `circuito-atlantico-inverso`

**No se permite ningún reset online ni de los demás circuitos.** No borrar perfiles, nicks, progresión, monedas, recompensas ni historial del servidor.

## Implementación

1. `src/game/stats/archiveRetiredTrackRecords.js`: migración local única marcada como `tdr2:trackGeometryReset:2026-10-23:v1:<id>`. Archiva por circuito en IndexedDB `tdr2:retiredTrackRecordsArchive`, store `snapshots` todos los valores originales de `tdr2:ttBest:`, `tdr2:ttHist:`, `tdr2:ghostPb:`, `tdr2:ghostGeometry:<id>:`, `tdr2:ghost:<id>:` y `tdr2:topReplay:<id>:`. Los nombres son precisos para evitar tocar incluso otros circuitos que compartan prefijos. El merge del snapshot preserva una copia previa tras migración interrumpida. Sólo elimina claves originales **después** de concluir la transacción IndexedDB. Si IndexedDB está bloqueado/sin cuota/no disponible, NO elimina el contenido de ese circuito. El marcador impide eliminar después las nuevas marcas.
2. `src/main.js`: espera a que termine el archivado antes de crear el juego y permitir que RaceScene lea tiempos antiguos; tras finalizar, permite entrar sin fallar incluso si algún circuito no pudo archivarse, en cuyo caso sus datos originales permanecen.
3. El índice derivado `tdr2:raceRecords:v1` pierde únicamente las entradas migradas; los demás circuitos y metadatos cloud no se tocan y el índice se reconstruye naturalmente al abrir Race Control. Se evita disparar limpiezas legacy generales.
4. Con `tdr2:ttBest` y `tdr2:ttHist` reiniciados, la primera vuelta válida de cada uno de los cuatro nuevos trazados se convierte en primer PB local. El mecanismo previamente incorporado en `RaceTop10ReplayScene.js`/ `ghostReplayRecovery.js` crea `tdr2:ghostPb:<id>` directamente desde las muestras de la vuelta, sin descarga ni anuncio. No interviene el antiguo límite Top10 de otro trazado porque el historial local queda limpio.
5. `scripts/track-geometry-record-reset-smoke.mjs`: casos de los cuatro identificadores, seis familias de claves, no afectación a otras pistas/índice cloud, copia antes de eliminación, sin doble reset, fallo de backup seguro y primer PB local reproducible. Se añade al workflow de Pages. Se conserva la prueba previa `ghost-local-pb-recovery-smoke.mjs` actualizada para la serie 1.3.4.

## Cuestiones de calidad y límites

- **La copia histórica está sólo en IndexedDB del dispositivo/origen**, no en una descarga externa ni en Supabase. Desinstalar la app o limpiar los datos del sitio podría perder tanto la copia como el nuevo progreso; no hacerlo antes de exportar y confirmar respaldos.
- **Todavía no se ha borrado nada del móvil del propietario desde GitHub**. El reset se ejecuta por primera vez cuando el dispositivo carga esta DEV en su mismo origen; la app pública de Google Play 1.2.335/vc10 sigue con su propio almacenamiento y no recibe este cambio.
- Si un dispositivo abre la DEV sin IndexedDB, los registros anteriores se preservan; registro diagnóstico `window.__tdrLocalTrackArchiveOutcome` (sólo dev).
- La migración no puede corregir retrospectivamente récords remotos antiguos; VS online continúa con las protecciones de geometría actuales.
- Las pruebas automáticas validan el flujo sintético. **Pendiente** comprobar en iPhone/Android real que la DEV muestra Santa Cruz y Atlántico sin PB antiguo; registrar primera vuelta válida en cada dirección; salir, entrar en modo Fantasma sin Race Control y comprobar su grabación; observar que el menú de reproducción no muestra controles de carrera superpuestos. Evitar afirmar que se corrigió el menú por este reset: es una incidencia distinta.
- No generar binarios ni publicar Google Play sin nueva petición explícita.
