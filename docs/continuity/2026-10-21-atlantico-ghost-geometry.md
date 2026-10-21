# Atlántico — compatibilidad de fantasmas con el circuito al 70 % (21/10/2026)

## Diagnóstico

El propietario detectó un fantasma gigantesco circulando por una trayectoria distinta en Circuito Atlántico. El circuito pasó del 100 % al 70 % en coordenadas del mundo, pero el identificador persistente de carrera siguió siendo el mismo. Las grabaciones de fantasma guardan X/Y absolutas y no incluían una firma de geometría; por tanto, una vuelta guardada antes de la reducción podía reproducirse sobre la pista nueva. Atlántico Inverso comparte la carretera física y requería idéntica protección. También existía una segunda causa para el tamaño del coche: sprites con texturas de diferente resolución heredaban el valor numérico de escala del coche visible.

## DEV 1.2.335 — cambio aplicado en main

- `src/game/tracks/ghostTrackCompatibility.js`: comprueba el ID de pista y una huella estable `geo1:` (tamaño del mundo, meta y puntos de carretera). En fantasmas Atlántico anteriores a la huella, distingue si sus posiciones pertenecen a la carretera al 70 % o encajan solo al reescalarlas desde el 100 %. Si no encajan, **no los reproduce**. No intenta modificar las muestras antiguas. Los fantasmas previos de otros circuitos siguen funcionando sin migración general.
- `RaceStaticGhostStatusScene.js`: valida tanto rival local como online ANTES de crear el sprite y no sustituye rivales online incompatibles por locales. Muestra aviso. Mantiene el PB oficial.
- Si el PB pertenece al trazado antiguo, permite crear un fantasma nuevo en el trazado actual cuando se complete una vuelta válida en modo fantasma, aunque no supere el récord histórico. Almacena la nueva repetición bajo `tdr2:ghostGeometry:<trackId>:<geometryRevision>`, con `kind='circuit-geometry-best'`, **sin sobrescribir** `tdr2:ghostPb:<trackId>`, `tdr2:ttBest:<trackId>` ni los datos remotos. Se distingue en la interfaz como «VUELTA ACTUAL».
- `RaceGhostModeScene.js`: copia ancho y alto *visibles en coordenadas del mundo* al cambiar la textura del fantasma, evitando tamaños desproporcionados entre vehículos.
- `sessionRecordPublishOffer.js`: impide publicar una repetición incompatible tras ver un anuncio; lo comprueba ANTES de ofrecer el anuncio.
- `scripts/ghost-atlantico-world-version-smoke.mjs`: test sintético de grabación antigua 100 %, grabación válida 70 %, inversos, futuras huellas de geometría, no borrado de PB, publicación y tamaño del sprite. Incluido en Pages y flujos Android para próximas versiones.

## Riesgos, publicación y pruebas reales

La DEV 1.2.335 es posterior a la APK QA 1.2.334 y al AAB Google Play 1.2.334/versionCode 9. **Esos binarios ya compilados NO tienen este arreglo**. No publicarlos como solución al fantasma; pedir autorización antes de empaquetar una nueva candidata firmada con la clave original del Mac. No se ha publicado nada en Google Play por este cambio.

Revisar visualmente Atlántico Normal e Inverso, el modo fantasma local y rivales online antiguos, tamaño al cambiar de coche, cancelación de replay incompatible y creación de una nueva repetición sin superar el PB anterior. Las pruebas CI no sustituyen una prueba real en el teléfono.
