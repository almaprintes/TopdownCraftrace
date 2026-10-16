# Track Studio — SALIDA y META independientes (DEV 1.2.226)

## Problema
Al dibujar el nuevo rally Arafo → Los Loros sobre una imagen cenital, el usuario solo veía la herramienta META. El editor ya tenía una herramienta interna `start` y guardaba `startLine`, pero el menú agrupado de herramientas únicamente listaba cierre de circuito, META, checkpoints y pianos. Además, el botón abreviado `SAL` de la barra superior puede quedar fuera de la zona útil en pantallas estrechas.

## Solución
- Nueva barra persistente dentro del viewport con botones táctiles de al menos 44 px: **SALIDA** (verde) y **META** (blanco/azul). Implementación DOM en `src/game/studio/trackStudioGateControls.js`, sin `Phaser.Text.setText` (previene el problema WebGL/iOS ya documentado).
- El selector de modo agrupado añade `SAL`. La barra inferior está disponible también cuando la superior no cabe.
- Seleccionar SALIDA o META activa el modo correspondiente; **un toque sobre el asfalto** coloca la línea perpendicular al recorrido. Ambas líneas son independientes.
- Después de colocar cualquiera de las dos, se actualiza el indicador y se crea recuperación automática. Deshacer/Rehacer y las cargas también refrescan el estado de botones.
- La geometría del trazado y los bordes permanece inalterada. La exportación existente conserva `editor.startLine`/`gameTrack.startLine` y `finishLine` en JSON y en `.tdrtrack`. En `stage`, el coche sale detrás de la línea verde y la carrera finaliza en la blanca; no hay parrilla ni tramo de retorno.

## Instrucciones
1. Abrir Track Studio e importar o crear el lienzo fotográfico.
2. Dibujar el trazado **abierto** (icono candado abierto).
3. Pulsar **SALIDA** abajo a la izquierda del viewport y tocar el punto inicial de la carretera: aparecerá una línea **verde**.
4. Pulsar **META** y tocar el punto final: aparecerá una línea **blanca**.
5. Guardar el `.tdrtrack`; comprobar que se mantienen las dos líneas al reabrir.

## Pruebas y entrega
`node scripts/trackstudio-start-finish-access-smoke.mjs` comprueba la accesibilidad, la selección de herramientas, la independencia de las líneas, su conservación en las exportaciones, el autoguardado y el desmontaje de controles. Se añade al workflow Pages. Publicar únicamente en `main` cuando el SHA exacto tenga **Build y Deploy correctos**. No crear APK ni actualizar Google Play sin solicitud expresa.
