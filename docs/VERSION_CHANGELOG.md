# Top Down RACE: CraftRace — Version & Bug-Fix Registry

> **Documento de consulta periódica.** Antes de diagnosticar un bug reportado por un tester, comprobar aquí la versión afectada y si el problema ya figura como corregido en una versión posterior.

## Protocolo

- Cada build identificable de `develop` y cada beta publicada en `main` debe tener una versión visible.
- Cada cambio de versión debe registrar: fecha, rama, correcciones, regresiones conocidas y commits relevantes.
- Cuando llegue un bug de un tester, registrar la **versión exacta** en la que ocurrió antes de modificar código.
- Antes de trabajar en un bug, buscarlo primero en este registro para evitar corregir dos veces el mismo problema.
- Un arreglo solo se marca como **CORREGIDO** cuando está incorporado en la versión indicada; si aún requiere prueba real, marcar **PENDIENTE DE VALIDACIÓN**.
- `develop` es el campo de pruebas. `main` no debe asumir una corrección hasta que ésta haya sido validada y fusionada.

## Procedimiento obligatorio de despliegue de DEV

- **NO asumir que un push a `develop` publica correctamente `/dev/`.** Se ha comprobado que el job de build puede completar todos sus pasos con éxito y, aun así, fallar el job final `deploy` de GitHub Pages cuando el workflow se ejecuta desde `develop`.
- La ruta fiable es: modificar `develop` → dejar que compile si corresponde → **disparar la publicación desde `main`** mediante un commit técnico en `.github/preview-trigger.txt`.
- El workflow de `main` reconstruye simultáneamente la raíz estable y la build actual de `develop`, copiando esta última bajo `/dev/`.
- Antes de decir que una nueva DEV está lista para probar, comprobar que el workflow lanzado desde `main` ha terminado con `conclusion: success`.
- Si una ejecución desde `develop` aparece roja pero el job `build` está verde y solo falla `deploy`, **no diagnosticar el juego**: es un problema de publicación de Pages, no de compilación de la app.
- Evitar repetir el intento de publicar directamente desde `develop`; usar el trigger de `main` de forma deliberada.

---

## DEV 0.0.2 — 2026-09-01

**Rama:** `develop`

### Fabricación / Upgrade Workshop

- **CORREGIDO:** migración de la interfaz problemática de Fabricación desde textos/modales Phaser hacia DOM para evitar solapamientos entre ambas capas.
- **CORREGIDO:** restaurada la barra inferior de piezas instaladas y su comportamiento funcional tomando `main` como referencia.
- **CORREGIDO:** restaurado el panel del coche actual y sus barras de estadísticas dinámicas.
- **CORREGIDO:** las barras de estadísticas vuelven a reflejar visualmente el efecto/tier de las piezas instaladas.
- **CORREGIDO:** flujo posterior a fabricar una pieza; el cuadro de guardar/instalar deja de mezclarse con la interfaz Phaser anterior.
- **CORREGIDO:** disposición del selector de familia y tier de piezas en la interfaz DOM.
- **CORREGIDO:** estados de materiales (cantidad disponible, requerida, porcentaje y faltantes) dentro de las tarjetas.
- **CORREGIDO:** botón de fabricación cuando faltan materiales: el texto ya no debe saltar a dos líneas ni desbordar verticalmente su hueco.
- **CONSERVADO:** comportamiento original de instalación/cambio de piezas y barra inferior, evitando simplificar su lógica al migrar la presentación.

### Estadísticas

- **CORREGIDO:** la imagen del coche en la tarjeta principal de Estadísticas podía quedar anclada demasiado abajo y fuera del área visible, aunque la vista de detalle funcionara correctamente.
- **CAMBIO:** el arte del coche de la tarjeta resumen ahora se centra dentro de un marco propio en la columna izquierda, independiente de la altura y distribución del bloque de información derecho.
- **PENDIENTE DE VALIDACIÓN:** comprobar visualmente en iPhone horizontal que el coche permanece centrado con tarjetas de distinta altura y con diferentes modelos.

### Cuenta / inicio limpio

- **DETECTADO:** una supuesta partida nueva podía conservar piezas de sesiones anteriores porque el estado `tdr2:garageFusion:v1` y otras claves persistentes no tenían una ruta de borrado canónica desde Configuración.
- **CONFIRMADO:** el estado base de `garageStore.js` inicia con inventario vacío; un motor T1 o una suspensión T4 al empezar no forman parte del inventario inicial previsto.
- **AÑADIDO:** nueva pestaña `CUENTA` en Configuración.
- **AÑADIDO:** `RESETEAR PROGRESO` elimina progreso de juego (garaje, piezas, inventario, monedas, estadísticas, récords, maestría, temporadas, desbloqueos y telemetría) pero conserva `tdr2:settings` y herramientas DEV/admin necesarias durante pruebas.
- **AÑADIDO:** `ELIMINAR CUENTA` elimina todos los datos locales del perfil en el dispositivo, incluidos ajustes, `sessionStorage` y la base IndexedDB `tdr2_track_previews`.
- **SEGURIDAD UX:** ambas acciones muestran un modal DOM de confirmación explícito indicando que la operación no puede deshacerse y que los datos/progreso no pueden recuperarse.
- **CORREGIDO:** tras un reset limpio, la reparación histórica `_repairLostGriplinePartsOnce()` reinyectaba automáticamente `tires_street` T1 y `transmission_prototype` T4 al interpretar el inventario vacío como pérdida de piezas antiguas. Esa migración de agosto se retira del flujo normal; un perfil nuevo ya no debe recibir esas piezas.
- **CAUSA RAÍZ DOCUMENTADA:** el reset sí eliminaba correctamente el inventario; la contaminación ocurría después, al entrar en Fabricación, por una migración legacy que volvía a sembrar las piezas.
- **NOTA DE ARQUITECTURA:** actualmente la cuenta es local. Si se incorpora backend/sincronización de cuenta, `ELIMINAR CUENTA` deberá ampliarse para solicitar también el borrado remoto antes de considerarse eliminación completa de cuenta.
- **PENDIENTE DE VALIDACIÓN:** probar en iPhone que `RESETEAR PROGRESO` deja inventario vacío y devuelve la inducción/desbloqueos a estado inicial conservando idioma, controles y gráficos.

### Inducción / Lobby

- **MEJORA UX:** durante la misión 2 `Conoce tu máquina / Know Your Machine`, el lobby identifica visualmente que el coche central es el acceso al Garaje.
- **AÑADIDO:** pulso cian breve sobre el coche y llamada DOM `TOCA TU COCHE / TAP YOUR CAR` con flecha hacia el vehículo.
- **REGLA:** la ayuda solo aparece mientras la tarjeta activa del Pase muestra esa misión; al entrar al Garaje deja de existir con la escena y no se muestra en misiones posteriores.
- **OBJETIVO:** enseñar la navegación mediante la propia interfaz, evitando instrucciones largas del tipo “pulsa el coche central”.

### Mini tutoriales de primera visita

- **AÑADIDO:** sistema común DOM/CSS de mini tutoriales de una sola aparición para las secciones principales.
- **SECCIONES CUBIERTAS:** Garaje, Fábrica, Inventario, Tienda, Estadísticas, Circuitos, Pase de Temporada y Configuración.
- **REGLA DE CONTENIDO:** cada modal explica únicamente la responsabilidad real de su sección. Garaje no habla de equipar piezas; esa función pertenece a Fábrica.
- **PERSISTENCIA:** cada sección usa su propia marca `tdr2:onboarding:section:<sección>:v1` y deja de mostrarse al pulsar `ENTENDIDO`.
- **AÑADIDO:** botón `REINICIAR TUTORIAL` en Configuración → Cuenta. Borra únicamente las marcas de estos mini tutoriales; no modifica progreso, monedas, coches, piezas, estadísticas, temporadas ni ajustes.
- **COMPORTAMIENTO:** después de reiniciar tutorial, cada explicación vuelve a mostrarse una sola vez cuando el jugador vuelva a visitar esa sección.
- **DOCUMENTADO:** arquitectura y puntos de integración en `docs/continuity/2026-09-01-first-visit-mini-tutorials.md`.
- **PENDIENTE DE VALIDACIÓN:** revisar en iPhone horizontal que todas las modales caben bien y que Tienda/Inventario aparecen por encima de sus modales Phaser sin bloquear su cierre posterior.

### Arquitectura / UI

- **REGLA CONFIRMADA:** los textos de estas interfaces deben ser DOM; no reintroducir `Phaser.Text` para solucionar problemas visuales de Fabricación.
- **DOCUMENTADO:** al modificar pantallas híbridas, localizar primero el flujo/clase real ejecutada y su herencia antes de aplicar overrides; varios intentos anteriores no alcanzaban el método real usado después de `_craftDirect()`.

### Identificación de build

- Versión técnica incrementada de `0.0.1` a `0.0.2`.
- La pantalla de orientación identifica esta build como **DEV 0.0.2** para distinguir capturas y reportes de testers.
- El badge visible de versión está definido también en `src/safe-area.css`; debe mantenerse sincronizado con `package.json` y este registro.

### Commits relevantes

- `efa976d534dc0bca954fdce680c16be4646ddb66` — pulido visual / identificación DEV 0.0.2.
- `dbe5f1b79100cf7f2c80f2611b80abdc458c502a` — versión técnica 0.0.2.
- `416f8a7a415b62265ef2348170ee456518313601` — centrado robusto del coche en la tarjeta principal de Estadísticas.
- `f0fe92b2e4410e9611dea6daa5140863ebda906e` — pestaña Cuenta, reset de progreso y eliminación local de cuenta.
- `38d6576d1a12e60df3cb702b834ccaa4ba35e9f6` — retira la reparación legacy que reinyectaba Neumático Street T1 y Sequential Prototype T4 tras un reset.
- `89350fa86bfb708d1399642d228f3ec51668a89a` — lógica contextual de ayuda para entrar al Garaje desde el coche del lobby.
- `b10e461ea15833949e5d24ad86ed95f35ab07d60` — animación/pulso y llamada visual de la misión `Conoce tu máquina`.
- `39d3b20bd76bcd1ae85a2ecd480454c73f14c351` — sistema común de mini tutoriales de primera visita.
- `efb120a581eece388d70b8c81356ba59d27f6085` — bienvenida de Garaje.
- `c04ccbe5bf0d06c604bd47ff120882c0aad22610` — bienvenida de Fábrica.
- `47e64f9def93da8eb35e7e63a52c6c99569d67e8` — bienvenida de Estadísticas.
- `ee19802d73a26854f029f7bc297abdc67db49413` — bienvenida de Pase de Temporada.
- `938c6d1ed2204b1bb6ae3c4d93fd8720330a8a37` — bienvenida de Circuitos.
- `16f85a722b972c6e9d52486a745eda1192a7b7a1` — bienvenidas de Tienda e Inventario.
- `54b82a99ed0f091ce53b983c6a3edc5fc7855e2e` — bienvenida de Configuración y botón Reiniciar tutorial.
- `78c3c86ad5b947da253204cbf5491132caedc1d1` — disparo de despliegue asociado a la primera publicación de la serie.

### Validación

Estado actual: **Fabricación considerada funcional y visualmente cerrada**. Estadísticas, limpieza de estado inicial, guía contextual de inducción y mini tutoriales de primera visita continúan en validación dentro de DEV 0.0.2.

---

## Registro de bugs de testers

Añadir futuras incidencias con este formato:

### BUG-XXXX — título breve
- **Reportado en:** BETA/DEV x.y.z
- **Pantalla/sistema:**
- **Síntoma:**
- **Reproducción:**
- **Estado:** NUEVO / INVESTIGANDO / CORREGIDO / NO REPRODUCIDO
- **Corregido en:** x.y.z
- **Commit:**
- **Notas:**
