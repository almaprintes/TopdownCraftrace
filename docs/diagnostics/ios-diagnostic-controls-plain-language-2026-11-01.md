# TDR iPhone DEV — etiquetas comprensibles en el panel de diagnóstico
Fecha: 2026-11-01.

**Norma:** cada botón indica la próxima acción que se ejecutará, no el estado vigente. Los controles de prueba se etiquetan «ACTIVAR» o «DESACTIVAR» y mantienen «REINICIA» si recargan TDR.

- FPS: «ACTIVAR LÍMITE 60 FPS» frente a «DESACTIVAR LÍMITE 60 FPS». El valor técnico `fps.limit=0` significa **sin tope extra**, no 0 fotogramas por segundo.
- Resolución: «ACTIVAR NITIDEZ REDUCIDA» frente a «DESACTIVAR NITIDEZ REDUCIDA». Las escalas 1,5 (normal según dispositivo) y 1,0 (reducida) son resolución de render interno, no versiones del juego.
- Sincronización WebGL y bucle: las etiquetas distinguen activar/desactivar pruebas. El estado real de sincronización WebGL sigue apareciendo como no disponible cuando el navegador no lo expone.
- Fotografía, HUD, motor y textos: el botón indica si al tocarlo se va a ocultar/mostrar, silenciar/reactivar o activar el otro tipo de texto. «REINICIAR MEDICIÓN» solo reinicia contadores del diagnóstico; nunca el progreso.
- Se agrega una ayuda desplegable, cerrada por defecto para no reducir el espacio disponible en pantalla horizontal, con la explicación de FPS, escalas y reinicios.
- Se mantiene el informe técnico para comparar mediciones previas, pero el estado actual se describe claramente con «LÍMITE EXTRA 60 FPS: ACTIVADO/DESACTIVADO» y «NITIDEZ: NORMAL/REDUCIDA».
- Solo DEV diagnóstico iPhone. No se tocan físicas, WebGL, ajustes efectivos, Android ni producción. Los tests existentes conservan las comprobaciones de aislamiento y se actualizan a los nuevos textos. 
