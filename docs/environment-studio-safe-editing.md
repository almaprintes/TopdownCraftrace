# Environment Studio · edición protegida y herramientas activas

Esta revisión retira del **interfaz** los paneles de texturas MATERIALES (ASFALTO/HIERBA/OFFROAD) y el botón obsoleto **ASF** de pintura procedural. Las fotos nativas de Track Studio ya contienen el acabado del asfalto y los pianos. No se eliminan `materials` ni `surfaces` de los JSON anteriores, ni se modifica el trazado o la física de los coches.

## Colisiones en foto
- **✒ COL / PLUMA**: crear nodos Bézier tocando, dibujar curvas tocando y arrastrando; **TERMINAR** guarda la línea. Se crea un checkpoint de seguridad independiente de localStorage.
- **▱ ZONA / MANO ALZADA**: dibujar varias pasadas alrededor de una arboleda, **MOVER MAPA / CONTINUAR** sin cerrar, **TERMINAR** para producir el polígono sólido.
- Para una pluma **sin terminar**, pulsar otra herramienta no la descarta: muestra una advertencia. Elegir **TERMINAR**, **CONTINUAR** o **CANCELAR** explícitamente. El botón de pluma reanuda el borrador en lugar de inicializar un proyecto vacío.
- Se guarda una copia de emergencia tras soltar el dedo, incluso si el toque se interrumpe. Una copia nueva no sobrescribe GUARDAR ni los datos de la versión publicada.

## Salida segura
- Botón **SALIR** y navegación Atrás solicitan confirmación. Cancelar permanece en el editor.
- Antes de salir, navegar o recargar se escribe `tdr2:environment-exit-recovery:<trackId>` con JSON completo, pluma provisional, zona provisional y puntos de los trazos.
- **RECUPERAR SESIÓN INTERRUMPIDA** ofrece una copia hallada en el mismo navegador/dispositivo. La recuperación es explícita: informa del número de líneas, zonas y nodos; crea `tdr2:environment-before-restore:<trackId>` antes de sustituir el editor. Después se debe revisar, TERMINAR, GUARDAR y EXPORTAR.
- Los eventos de navegación se eliminan al salir y no bloquean pantallas ajenas a Environment Studio.
- Los navegadores iOS pueden no presentar la confirmación nativa al cerrar forzosamente la pestaña; la copia de emergencia sigue intentándose en `pagehide`.

## Estado protegido de Karting Tenerife
El circuito jugable oficial mantiene su fotografía, física y siete polígonos sólidos integrados. El JSON publicado no incluye todavía las líneas de pluma que faltaban en la exportación anterior: solo se recuperarán desde un almacenamiento local real. No se inventan nuevas líneas.

## Verificación
Ejecutar `node scripts/environment-safe-exit-smoke.mjs` y los smoke previos de Environment Studio, compilar DEV y verificar la ejecución HEAD de GitHub Actions con Build y Deploy en verde.
