# DEV 1.3.1 — Apertura de nueva etapa y meta del paddock en Américas Inverso (22/10/2026)

## Contexto

El propietario confirma que la actualización de Top Down RACE ya se ha publicado en Google Play. Esta confirmación corresponde al estado observado por el propietario; no se ha comprobado todavía en Play Console el estado exacto/versionCode. El repositorio conserva documentos históricos anteriores a esa publicación: no usarlos como estado actual del despliegue público.

A petición expresa del propietario, la línea de desarrollo visible pasa de **DEV 1.2.335** a **DEV 1.3.1**. La única rama activa continúa siendo **main**. El identificador visual de DEV se controla mediante `<meta name="tdr-dev-version" content="DEV 1.3.1" />` en `index.html`. No se modifica `android/app/build.gradle`, no se lanza ni firma otro APK/AAB y no se crea una nueva rama. Google Play no cambia por actualizar la PWA.

## Incidencia y causa confirmadas

El usuario detectó que, en `karting-americas-inverso`, cruzar la raya pintada del paddock sobre el eje de META no contabilizaba el paso como meta. La implementación de `RaceScene.js` autorizaba el paso extra exclusivamente si `this.trackKey === 'karting-americas'` y su `trackId` coincidía exactamente. El circuito inverso tiene su ID independiente y quedaba excluido. Además, `makeInvertedClosedTrack` invertía `finishLine` y los checkpoints pero heredaba sin invertir `meta.paddockFinishLine.normal`, impidiendo reconocer los cruces en el sentido inverso.

## Corrección limitada a gameplay de Américas

- `RaceScene.js`: identifica el circuito físico mediante `physicalCircuitId` tanto en `trackKey` como en el `meta.meta.trackId` de la pista cargada. El paddock solo puede habilitarse en Américas normal e inverso. Se mantiene la exigencia de los dos checkpoints en orden, sentido correcto, cooldown y carrera iniciada.
- `trackReverseVariant.js`: la variante inversa conserva exactamente los extremos físicos de `paddockFinishLine` pero invierte únicamente su normal lógica. La foto, pintura de la pista, geometría, metadatos de récord y tiempos no se mueven.
- `scripts/all-circuit-directions-smoke.mjs`: comprobación para ambas variantes: gate presente, extremos idénticos, normales opuestas, cruce válido en sentido correcto, rechazo de cruce inverso y paso sin movimiento, aplicación al circuito físico y guardas de checkpoints.
- `scripts/karting-americas-official-smoke.mjs`: assert actualizado para admitir las dos variantes sin abrir el reconocimiento a otros circuitos.

## Validaciones y alcance

Al confirmar esta DEV, el pipeline Pages `.github/workflows/pages.yml` debe terminar en `completed/success` para el SHA que incluya el cambio de versión y pruebas. CI es comprobación sintética: hace falta una prueba en dispositivo real de Américas normal e inverso (CP1 → CP2 → meta por paddock), paso erróneo contra sentido, meta central y continuidad del récord/persistencia.

**No asumir nueva publicación de Play ni nueva APK.** El `versionCode` público siguiente se decide solo en una futura actualización autorizada.
