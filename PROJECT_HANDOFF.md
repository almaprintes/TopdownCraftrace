# TopdownCraftrace — PROJECT HANDOFF

## ACTUALIZACIÓN 22/09/2026 — RECONSTRUCCIÓN DEL MOTOR HÉLIX SPARK

DEV 1.1.166 sustituye la ruta experimental de seis `HTMLAudioElement` remotos por un único grafo WebAudio con muestras locales. Los seis WAV CC0 viven en `public/assets/audio/engine/spark/`, se descargan y decodifican antes del gesto de encendido cuando la plataforma lo permite, comienzan sobre el mismo reloj de audio y se mezclan por RPM con crossfade de potencia constante. Spark no tiene fallback procedural: cualquier fallo del banco real queda visible en consola.

La señal de audio lee exclusivamente `carBody.body.velocity`, `touch.throttle` y las teclas de aceleración ya usadas por la carrera. No escribe input, aceleración ni física. El gas puede subir RPM con el coche parado desde que se enciende el motor. El grafo se cierra tanto en resultados como en `shutdown`, y reintenta reanudar el `AudioContext` después de suspensión de página.

Auditoría, hashes, licencia, arquitectura y checklist de dispositivo: `docs/continuity/2026-09-22-spark-engine-audio-rebuild.md`.

## ACTUALIZACIÓN 21/09/2026 — TIENDA / IAP DE MONEDAS APLAZADO
- Los packs de monedas por dinero real se han retirado del código/runtime de la build actual antes de revisión de Google Play. No reintroducirlos hasta una actualización futura explícita.
- La tienda actual conserva packs de materiales comprados con moneda interna, recompensas y recicladora.
- El renderer visible final de tarjetas de materiales está en MenuDuelModeScene.js (override del renderer heredado).
- DEV 1.1.96 elimina el doble recorte de textos durante el scroll: la máscara geométrica del contenedor es la autoridad para clipping y la limpieza de visibilidad ocurre al asentarse el movimiento.
- Continuidad detallada: docs/continuity/2026-09-21-store-material-cards-coin-iap-deferred.md


> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Fuente oficial: `almaprintes/TopdownCraftrace`. Desarrollo normal en `main`; beta pública estable en `beta-1.0`.


## ACTUALIZACIÓN DE CONTINUIDAD — 19/09/2026 — BETA GOOGLE PLAY 1.0.214: INCIDENCIAS REALES

La beta cerrada de Google Play fue actualizada correctamente desde 1.0.0 a **1.0.214 (versionCode 2)** y quedó disponible para los 16 testers. Prueba real en Android mediante actualización desde Play Store, sin desinstalar: **progreso local preservado** (monedas, coche seleccionado, temporada y PB locales). `beta-1.0` queda congelada; no tocarla.

### PRIORIDAD ABSOLUTA AL ABRIR DEV 1.1.x
Antes de implementar VS Ghost, rewarded nuevos o compras reales, reproducir/auditar y corregir estas incidencias de la build Android publicada. No asumir causas sin inspección/profiling.

1. **Rendimiento Android release: ~25 FPS en carrera.** Confirmado visualmente por el contador FPS en la build de Google Play, también fuera del modo Fantasma. Es prioridad nº1: medir antes de degradar gráficos al azar. Investigar WebView/Capacitor, DPR/render scale, Phaser, HUD/minimapa, objetos/vegetación, efectos y regresiones recientes. No añadir carga de VS Ghost hasta entenderlo.
2. **Race Control online no conecta en el AAB publicado.** La UI/local funciona y conserva PB, pero ACTUALIZAR pasa de SIN CACHÉ a ERROR/REINTENTAR. Hipótesis fuerte pendiente de verificación: el build local usado para el AAB no recibió `VITE_TDR_ONLINE_URL` y `VITE_TDR_ONLINE_PUBLIC`; GitHub Pages DEV sí las inyecta explícitamente. El cliente lanza `Online backend not configured` si faltan. Verificar el contenido/build Android antes de tocar Supabase. No tocar tablas/RLS/backend por esta incidencia sin evidencia.
3. **Rewarded x2 ausente.** Tras finalizar una sesión aparece BOTÍN DE LA SESIÓN (piezas, vueltas premiadas, bonus, cofre) pero no aparece opción x2. Auditar integración Android real de AdMob/RevenueCat/placement y detección de plataforma. No asumir que comparte causa con Supabase.
4. **Selector de circuitos: último elemento no recibe toque.** En Android el elemento inferior visible (Circuito Atlántico en la prueba) no se puede seleccionar. Investigar hit area/overlay/overflow/z-index/viewport del modal/lista; no modificar datos/coordenadas de circuitos para corregirlo.
5. **Modo Fantasma: HUD flotante mal adaptado en Android.** Los elementos que se estabilizaron en iPhone no quedan correctamente posicionados en este viewport Android; DELTA/estado de fantasma/minimapa invaden zonas. Corregir responsive/safe-area específicamente sin romper el HUD estable de iPhone ni tocar DELTA funcional.

### Validaciones positivas de la build publicada
- Google Play ofreció ACTUALIZAR sobre la instalación anterior y Play Protect la verificó.
- El juego arrancó tras actualizar sin reinstalar.
- Perfil de piloto nuevo funcionó (prueba: JUANFRIKI).
- Se conservaron 5.100 monedas, Hélix Spark seleccionado, progreso 1/3 de temporada y PB locales (ej. Santa Cruz 0:13.744).
- Race Control carga correctamente su capa local y lista de circuitos/PB; el fallo aparece al intentar la operación online.
- Carrera y entrega de botín funcionan; el problema de rendimiento es real pero el loop base no quedó bloqueado.

### Regla nueva de publicación Android
Antes de subir el próximo AAB a Play Console, instalar/probar el **release Android equivalente** y exigir como mínimo: progreso preservado al actualizar; Race Control conecta a Supabase; rewarded x2 aparece y completa correctamente; selector de circuitos totalmente táctil; modo Fantasma/HUD correcto en Android; FPS aceptables en los escenarios de referencia; y, cuando se implemente, compra de prueba Google Play/RevenueCat sin doble entrega. Verificar además que las variables públicas de Supabase están embebidas en el build release. No publicar basándose únicamente en que DEV web funciona.

### Orden recomendado para el chat DEV 1.1.x
Primero auditoría y diagnóstico de estas cinco incidencias, empezando por rendimiento Android y configuración del AAB. Después corregirlas en bloques pequeños verificables. Solo entonces continuar con VS Ghost, rewarded para Race Control y paquetes consumibles de monedas. La función protagonista de la próxima actualización sigue siendo **VS Ghost / desafíos online**; monetización se integra en la misma etapa, pero no debe ocultar estos bugs de la beta real.

## ACTUALIZACIÓN DE CONTINUIDAD — 18/09/2026

### Leaderboard online / ghost validado

Se completó la investigación real en dispositivo del formato de ghost online. La arquitectura, mediciones Atlántico/Tenerife, decisiones de monetización, estado de Supabase y próximos pasos están documentados en:

- `docs/continuity/2026-09-18-online-leaderboard-ghost.md`

Decisión vigente: conservar todas las muestras nativas `{t,x,y,r}`, cuantizar X/Y a 0,25 unidades y rotación a 0,0001 rad, y serializar el movimiento con delta + ZigZag + varint. No usar remuestreo fijo de 20–50 ms: las pruebas demostraron más error de trazada y/o más tamaño.

DEV 1.0.197 validó en Tenerife 596 muestras con **ROUNDTRIP EXACT** tras encode binario -> decode. Flujo de movimiento real: 3.475 B frente a 48.061 B del replay local completo; el binario no añade pérdida respecto al NATIVE cuantizado. El replay local no se sustituye ni se modifica.

Tras la validación se retiró el panel visual de laboratorio de Race Control. El codec validado permanece para la futura integración. Próximo paso: esquema/RPC atómico de récord+ghost en Supabase, referencia pública opaca y descarga controlada; después integración cliente/rewarded.

## ACTUALIZACIÓN DE CONTINUIDAD — 17/09/2026

### Supabase / leaderboard online

Se creó y configuró el proyecto Supabase para preparar los futuros leaderboards online. La configuración completa y las decisiones de seguridad/privacidad quedan registradas en:

- `docs/continuity/2026-09-17-supabase-bootstrap.md`

Estado a 17/09/2026: organización `CraftRace Studio`, plan Free, proyecto `TopDown RACE - Craftrace` en West EU (Ireland), PostgreSQL estándar, GitHub autorizado únicamente para este repositorio, Data API activada, exposición automática de tablas nuevas desactivada, Automatic RLS activado y Auth anónimo activado con Email y demás proveedores no usados/desactivados.

Arquitectura prevista: UUID anónimo de Supabase asociado al nick que ya pide Craftrace. Los usuarios anónimos usan rol `authenticated`, por lo que las futuras políticas RLS deberán aplicar mínimo privilegio mediante `auth.uid()` y no conceder acceso general por el mero rol. Antes de publicar una build que envíe UUID/nick/datos de leaderboard habrá que revisar y actualizar Data Safety en Google Play según la implementación real.

**Todavía NO se han creado tablas ni integrado Supabase en el código del juego.** La conexión GitHub de Supabase tampoco implica despliegue automático de migraciones: el futuro esquema/migraciones SQL deberá versionarse en el repo y su despliegue configurarse explícitamente. No guardar contraseña DB, `service_role` ni secretos en GitHub.

Esta actualización es solo documental y no cambia la versión visible de DEV ni toca `beta-1.0`.

## ESTADO OPERATIVO — 13/09/2026

### Reglas obligatorias

- Trabajar SOLO sobre `main` para desarrollo.
- NO tocar `beta-1.0` sin autorización explícita del propietario. Es la beta pública/final 1.0 congelada.
- NO reutilizar `beta-0.0.3` ni mezclar código/assets desde ramas antiguas, recovery, lab, preview, feat, fix, tmp o backup.
- `/dev` y `/dev-live` salen de `main`; `/` sale de `beta-1.0` mediante `.github/workflows/pages.yml`.
- Antes de cambios de despliegue leer `AGENTS.md` y `.github/workflows/pages.yml`.
- Cada cambio visible de DEV debe incrementar el marcador de versión y la verificación del workflow.
- No afirmar que un deploy está listo hasta comprobar GitHub Actions.
- No tocar DELTA, minimapa, física, pedales u otras capas estables al corregir una UI concreta salvo necesidad demostrada.

### Estado DEV actual — 1.0.76

La línea de desarrollo ha avanzado hasta **DEV 1.0.76**. La beta pública `beta-1.0` permanece congelada y no se ha modificado.

Trabajo reciente relevante para pruebas de calidad y para documentar ante Google Play:

- Race Control dispone de reproducción real embebida de vueltas guardadas y análisis visual de trazada.
- Se corrigieron presentación/sincronización de Race Control, metadatos del coche del récord y representación de marcas.
- Se corrigió la actualización del inventario tras usar la recicladora.
- Se añadió/compactó la sección Legal.
- Se ajustó la experiencia de carga para Android y posteriormente se aisló el ajuste a Android para evitar una regresión visual en iPhone.
- Se han realizado pruebas manuales repetidas en dispositivo real durante el desarrollo, detectando y corrigiendo incidencias de interacción táctil y pausa.

### Pausa de carrera — correcciones DEV 1.0.74–1.0.76

Durante pruebas manuales se reprodujo un caso límite al pulsar pausa justo antes de la luz verde del semáforo de salida. Al continuar, la carrera podía quedar iniciada mientras el semáforo permanecía visualmente apagado/fijo sobre la pista.

Diagnóstico: la pausa histórica detenía la física, pero el reloj/tweens de la escena podían continuar avanzando. Eso permitía que la lógica/presentación de la salida y la física quedaran en estados diferentes.

**DEV 1.0.74:** se añadió un guard de pausa que congela también el reloj de la escena y los tweens durante la pausa y los reanuda al continuar. Resultado validado manualmente: el caso límite del semáforo queda corregido.

Posteriormente se observó que la salida del menú de pausa parecía tardar varios segundos. Las pruebas manuales permitieron precisar que no era latencia de reanudación: algunos toques sobre `CONTINUAR` no estaban disparando la acción al primer intento.

**DEV 1.0.75:** se eliminó el `backdrop-filter: blur(8px)` a pantalla completa del overlay de pausa para reducir trabajo innecesario de composición sobre el canvas WebGL, especialmente relevante en móvil/iPhone.

**DEV 1.0.76:** `src/game/ui/racePauseUi.js` dejó de depender exclusivamente de `click`. Los botones del menú responden directamente a `pointerup`, mantienen `click` como respaldo y usan protección contra doble activación. Resultado de prueba en dispositivo real confirmado por el propietario: el problema queda **completamente corregido** y `CONTINUAR` responde al primer toque.

Este bloque es evidencia útil del ciclo de prueba cerrada: se detectó un caso límite real mediante uso del juego, se reprodujo, se aisló la causa, se corrigió y se volvió a validar en dispositivo real.

### Publicación de la beta 1.0 y plataformas

La beta pública 1.0 fue separada del desarrollo mediante la rama `beta-1.0`. `main` continúa como línea DEV independiente. Google Play Console tiene la app **Top Down RACE: CraftRace** en prueba cerrada. La prueba cerrada y el proceso de testers forman parte del camino a producción; no confundir el build DEV web con la beta de Play.

Integraciones preparadas durante esta fase:

- AdMob: apps Android/iOS creadas en la cuenta AlmaPrint; rewarded en integración/prueba.
- RevenueCat: clave pública SDK de Google Play configurada y vinculación Play Console ↔ RevenueCat realizada para la app.
- Android: keystore release local creada; Java/OpenJDK 17 preparado para build.
- Soporte web: `topdownrace.almaprint.es`.
- Shipaton 2026 sigue siendo objetivo de publicación/presentación.

### DELTA — congelado

El sistema DELTA funciona y se considera estable. No modificar salvo bug concreto reportado.

- Referencia local por sesión.
- V1 crea referencia; V2 compara inmediatamente contra V1.
- Una vuelta más rápida pasa a ser la siguiente referencia.
- El cruce del seam de progreso no se trata como meta falsa.
- DEV 1.0.22 compensó el tiempo de pausa para que no entre en delta/cronometraje.
- DEV 1.0.23 conserva panel DELTA abierto/cerrado al pausar/reanudar desde el control propio.
- DEV 1.0.24 añadió variación determinista/local del texto de informe de sesión, sin IA/backend.
- IA generativa para informes queda aplazada.

### Controles de dirección — DOM

Tras varios intentos con objetos Phaser afectados por el zoom/cámara, los botones IZQUIERDA/DERECHA se migraron a DOM fijo.

Principio vigente: los controles de pantalla que deban permanecer absolutamente inmóviles no deben compensar cada frame `getWorldPoint()` + `1/zoom` si pueden vivir en DOM.

Los botones DOM conservan posiciones de `readControlLayout().layout.left/right`, separación mínima y clamping aprobados, semántica `this.touch.buttonSteer = -1 / 1 / 0`, interacción táctil/estado pulsado y compatibilidad con layout zurdo. No tocar gas/freno/freno de mano ni física al trabajar en estos botones.

### Texto de diagnóstico — eliminado

El texto de diagnóstico provenía del `RaceScene.js` base (`_diagText` / `_diag`). `src/game/scenes/RaceNoDiagScene.js` neutraliza `_diag`, destruye `_diagText` y elimina firmas de diagnóstico en `postupdate`. Debe permanecer eliminado tanto en iOS como Android.

### Minimapa — DOM/SVG estático

DEV 1.0.34 migró el minimapa visible fuera de la cámara Phaser mediante `src/game/scenes/RaceStaticMinimapScene.js`. Trazado, meta y marcador se presentan en SVG/DOM fijo; el marcador sigue posición/orientación real del coche y el panel ya no respira con el zoom dinámico.

### Panel FANTASMA / RÉCORD CARGADO

DEV 1.0.35 migró el panel a DOM fijo mediante `src/game/scenes/RaceStaticGhostStatusScene.js`, evitando microdesplazamientos producidos por la cámara. Caja y texto comparten el mismo sistema de coordenadas y permanecen anclados al canvas.

### Historial reciente útil

- DEV 1.0.24: informe de sesión con wording local variable; DELTA estable.
- DEV 1.0.25–1.0.27: intentos fallidos de estabilizar controles; no reutilizar esas aproximaciones.
- DEV 1.0.28: restauración segura del sistema anterior de dirección.
- DEV 1.0.29–1.0.31: investigación del acoplamiento a cámara.
- DEV 1.0.32: dirección migrada a DOM fijo.
- DEV 1.0.33: capa robusta para eliminar diagnóstico.
- DEV 1.0.34: minimapa migrado a DOM/SVG fijo.
- DEV 1.0.35: panel de estado fantasma migrado a DOM fijo.
- DEV 1.0.62–1.0.68: evolución de Race Control/replay y análisis de trazada.
- DEV 1.0.69: reparación de sincronización de inventario tras recicladora.
- DEV 1.0.70–1.0.71: sección Legal.
- DEV 1.0.72–1.0.73: experiencia de carga móvil y aislamiento Android.
- DEV 1.0.74: pausa coherente durante la secuencia del semáforo.
- DEV 1.0.75: overlay de pausa sin blur global costoso.
- DEV 1.0.76: respuesta táctil del menú de pausa mediante `pointerup`; validado en dispositivo real.

### Criterios técnicos aprendidos

En iOS la `uiCam` está desactivada por estabilidad y gran parte del HUD histórico se renderiza mediante la cámara principal. Para HUD puramente de pantalla que necesite inmovilidad absoluta, preferir DOM fijo bien anclado al canvas.

En UI táctil móvil crítica, no depender únicamente de `click` cuando existe una capa que captura/bloquea gestos. `pointerup` ofrece respuesta directa y puede conservarse `click` como fallback con un guard contra doble ejecución.

Una pausa completa debe mantener sincronizados física, reloj de escena, tweens y presentación visual; pausar únicamente la física puede crear estados incoherentes en secuencias temporizadas como la salida.

No migrar masivamente sistemas estables: corregir de forma aislada y validar en dispositivo real.

## Estado histórico anterior

Las decisiones previas de fabricación, inventario, tienda, economía, IA de Supervivencia, assets, garaje, pistas y demás trabajo anterior a la beta siguen disponibles en el historial Git y en `docs/`. Este handoff prioriza el estado operativo posterior a la publicación de beta 1.0 para evitar que un chat nuevo parta de información obsoleta.
