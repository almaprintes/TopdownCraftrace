# Top Down RACE — pendientes para la próxima actualización

**Fecha:** 16/10/2026. **Estado:** implementados en código DEV 1.2.220. Pendiente de validar la ejecución real en un teléfono Android. **Rama de trabajo cuando se autorice:** `main`. **DEV de referencia:** 1.2.219. **Ámbito:** juego y Android; Google Play no se publica sin autorización expresa.

Estas tres peticiones fueron formuladas por el propietario después de incorporar Karting Américas como circuito permanente.

## 1. Cuentakilómetros individual en el velocímetro

- Añadir al HUD del velocímetro una lectura de **kilómetros totales recorridos** que vaya aumentando al conducir, al estilo del odómetro de un coche real.
- **Cada vehículo conserva su propio kilometraje**: al seleccionar Juanicar solo se ven los kilómetros de Juanicar; al pasar a Gripline aparecen los de Gripline, nunca los del vehículo anterior.
- El total persiste al cambiar de coche, terminar carreras, reiniciar la aplicación y volver a jugar. Aprovechar la persistencia de garaje/perfil y el sistema de guardado existente; revisar compatibilidad con la copia en la nube para no mezclar coches, perfiles o contadores.
- Contar únicamente desplazamiento real del coche por circuito; no incrementar por pantallas, teletransportes, cargas ni movimientos de cámara.
- Integración legible en móvil sin desplazar otros controles del HUD. El velocímetro actual se conserva.
- Verificación: conducir con Juanicar, comprobar subida; cambiar a Gripline, comprobar contador independiente; regresar a Juanicar, comprobar conservación; reiniciar y verificar persistencia.

## 2. Retirar ADLOG y PERF de la aplicación Android

- Quitar de las pantallas **Android** los indicadores/botones/overlays de depuración visibles como `ADLOG` y `PERF`.
- No eliminar los sistemas reales de anuncios ni la instrumentación necesaria para diagnosticar incidencias; retirar su exposición a jugadores en Android y revisar que no queden áreas táctiles fantasma.
- Verificar en APK real que ninguno aparece en lobby, carrera u otras pantallas. Evitar regresiones en web/iOS.

## 3. Reparar la animación de la plataforma del lobby en Android

- En Android no se reproducen correctamente las animaciones de intercambio de coches en el lobby.
- Comportamiento esperado ya aprobado: **descienden juntos la plataforma circular completa y el coche seleccionado** hasta desaparecer bajo el suelo, con oscurecimiento/profundidad; al elegir el nuevo coche, la plataforma vuelve a subir con él hasta quedar a ras del suelo.
- Revisar la ejecución real en Android (temporización, transformaciones, composición de capas y visibilidad) sin romper las transiciones de entrada a carrera ni la fluidez en iOS.
- Verificación en APK Android: varios intercambios consecutivos desde garaje, animación de bajada y subida visible, coche correcto, controles utilizables al terminar, sin parpadeos ni bloqueos.

## Entrega y verificación

Implementar los tres cambios juntos o en iteraciones coordinadas en `main`, incrementar versión DEV y comprobar Build y Deploy de GitHub Actions en verde para el HEAD final. **No dar estos cambios por completados por el mero hecho de estar documentados.** Si se solicita APK de pruebas, generarlo y verificarlo; no publicar en Google Play sin orden explícita.

### Cambios DEV 1.2.220 (16/10/2026)

- Cuentakilómetros del HUD directamente debajo del nombre del coche: incrementos visuales de **0,01 km = 10 m**, con los metros compartidos y guardados por `tdr2:playerStats:v1` (misma fuente que Estadísticas), sumando además los metros pendientes de escritura de la carrera activa.
- Estadísticas también presenta kilometraje con dos decimales sin redondear décimas de kilómetro, para que las lecturas correspondan al odómetro.
- Eliminación de los dos paneles/botones Android `AD LOG` y `PERF` del puente de anuncios, sin retirar el puente ni el diagnóstico nativo mediante API.
- Ascensor del lobby habilitado en APK nativos de Android aunque la compilación use el indicador `prod`; la web pública mantiene su configuración anterior. Se preserva el interruptor de reversión local.
- Añadida prueba de regresión `scripts/odometer-android-next-update-smoke.mjs` y generación de APK de prueba Android firmada con clave de pruebas en Actions. No se sube a Google Play.
