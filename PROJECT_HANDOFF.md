# TopdownCraftrace — PROJECT HANDOFF

> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Fuente oficial: `almaprintes/TopdownCraftrace`. Desarrollo normal en `main`; beta pública estable en `beta-1.0`.

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
